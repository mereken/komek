package com.komek.service;

import com.komek.dto.PayRequest;
import com.komek.dto.PaymentInfoDto;
import com.komek.model.*;
import com.komek.repo.PaymentRepository;
import com.komek.util.Cards;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

/**
 * Order payments with escrow ("безопасная сделка"), simulated:
 *   pay()            requester pays reward + budget -> PAID: the money is reserved for the order
 *   releaseAdvance() the work starts -> the budget (money for expenses) goes to the runner as an advance
 *   release()        requester confirmed the work -> RELEASED: runner gets reward - commission
 *   refund()         order cancelled -> REFUNDED: the reserved points go back to the requester's balance
 * The commission is taken from the reward only. The advance is not earnings; leftovers or shortfalls of the
 * expense money are settled between the two people directly (by phone).
 * The caller (TaskService / AdminService) locks the task row before calling.
 */
@Service
@Transactional
public class PaymentService {
    private static final List<PaymentStatus> HELD = List.of(PaymentStatus.PAID);
    private static final List<PaymentStatus> REAL = List.of(PaymentStatus.PAID, PaymentStatus.RELEASED, PaymentStatus.REFUNDED);

    /** ok = false: the (simulated) bank declined, nothing was charged. */
    public record Outcome(boolean ok, String message) {}

    private final PaymentRepository payments;
    private final WalletService wallet;
    private final NotificationService notifications;
    private final int percent;
    private final boolean testMode;

    public PaymentService(PaymentRepository payments, WalletService wallet, NotificationService notifications,
                          @Value("${app.commission-percent}") int percent,
                          @Value("${app.payments.test-mode}") boolean testMode) {
        this.payments = payments;
        this.wallet = wallet;
        this.notifications = notifications;
        this.percent = percent;
        this.testMode = testMode;
    }

    public int percent() { return percent; }

    /** Platform commission for an amount, rounded to a whole tenge. */
    public int commissionOf(int amount) {
        return BigDecimal.valueOf(amount).multiply(BigDecimal.valueOf(percent))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).intValue();
    }

    @Transactional(readOnly = true)
    public boolean isHeld(Long taskId) {
        return payments.findFirstByTaskIdAndStatusInOrderByIdDesc(taskId, HELD).isPresent();
    }

    @Transactional(readOnly = true)
    public PaymentInfoDto info(Long taskId) {
        return payments.findFirstByTaskIdAndStatusInOrderByIdDesc(taskId, REAL)
                .map(p -> new PaymentInfoDto(p.getStatus(), p.getAmount(), p.getCommission(), p.getPayout(),
                        p.getBudget(), p.isAdvanceReleased(), p.getMethod(), p.getCardLast4(), p.getUpdatedAt()))
                .orElse(null);
    }

    // ------------------------------------------------------------------ pay

    public Outcome pay(Task t, PayRequest r) {
        if (isHeld(t.getId())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Заказ уже оплачен");
        int reward = t.getReward();
        int budget = t.getBudget();
        int amount = reward + budget; // what the requester pays
        User payer = wallet.lock(t.getRequester().getId());

        Payment p = new Payment();
        p.setTask(t);
        p.setPayer(payer);
        p.setPayee(t.getRunner());
        p.setAmount(amount);
        p.setBudget(budget);
        p.setCommission(commissionOf(reward)); // commission is taken from the reward only
        p.setPayout(reward - p.getCommission());
        p.setMethod(r.method());

        if (r.method() == PaymentMethod.BALANCE) {
            wallet.debit(payer, amount, TxType.PAYMENT, t, "Оплата заказа №" + t.getId() + " «" + t.getTitle() + "»");
            p.setStatus(PaymentStatus.PAID);
            payments.save(p);
            return new Outcome(true, "Оплачено с баланса");
        }

        // ---- card
        boolean saved = Boolean.TRUE.equals(r.useSavedCard());
        String digits = null;
        String expiry = null;
        String last4;
        if (!Cards.validCvc(r.cvc())) throw bad("CVC: 3 цифры");
        if (saved) {
            if (!payer.hasCard()) throw bad("Сохранённой карты нет. Введите данные карты.");
            last4 = payer.getCardLast4();
        } else {
            digits = Cards.digits(r.cardNumber());
            if (!Cards.validNumber(digits)) throw bad("Номер карты: 16 цифр");
            expiry = Cards.normalizeExpiry(r.expiry());
            if (expiry == null) throw bad("Срок действия в формате ММ/ГГ, например 08/28");
            if (Cards.expired(expiry)) throw bad("Срок действия карты истёк");
            last4 = digits.substring(12);
        }
        p.setCardLast4(last4);

        if (testMode && Boolean.TRUE.equals(r.simulateFail())) {
            p.setStatus(PaymentStatus.FAILED);
            p.setFailReason("Банк отклонил платёж (тестовый сценарий)");
            payments.save(p); // the failed attempt stays in the history
            return new Outcome(false, "Банк отклонил платёж. Деньги не списаны. Попробуйте другую карту или оплатите баллами.");
        }

        p.setStatus(PaymentStatus.PAID);
        payments.save(p);
        if (!saved && Boolean.TRUE.equals(r.saveCard())) wallet.attachCard(payer, digits, expiry, null);
        return new Outcome(true, "Оплата прошла");
    }

    // -------------------------------------------------------- release / refund

    /** The work starts: the money for expenses goes to the runner's wallet as an advance (not earnings, no commission). */
    public void releaseAdvance(Task t) {
        Optional<Payment> held = payments.findFirstByTaskIdAndStatusInOrderByIdDesc(t.getId(), HELD);
        if (held.isEmpty()) return;
        Payment p = held.get();
        if (p.getBudget() <= 0 || p.isAdvanceReleased()) return;
        User runner = wallet.lock(p.getPayee().getId());
        wallet.credit(runner, p.getBudget(), TxType.PAYOUT, t,
                "Аванс на расходы по заказу №" + t.getId() + " (деньги заказчика, не доход)", true);
        p.setAdvanceReleased(true);
        notifications.send(runner, NotificationService.PROFILE, "ADVANCE", t,
                "На баланс зачислен аванс на расходы: " + p.getBudget() + " ₸ (деньги заказчика, не ваш доход)");
    }

    /** The requester confirmed the work: the runner gets the payout, the commission stays with the platform. */
    public void release(Task t) {
        Optional<Payment> held = payments.findFirstByTaskIdAndStatusInOrderByIdDesc(t.getId(), HELD);
        if (held.isEmpty()) return; // order from before payments existed: nothing to pay out
        Payment p = held.get();
        User runner = wallet.lock(p.getPayee().getId());
        p.setStatus(PaymentStatus.RELEASED);
        wallet.credit(runner, p.getPayout(), TxType.PAYOUT, t,
                "Оплата за заказ №" + t.getId() + " «" + t.getTitle() + "» (комиссия " + percent + "%: " + p.getCommission() + " ₸)");
        notifications.send(runner, NotificationService.PROFILE, "PAYOUT", t,
                "Вам начислено " + p.getPayout() + " ₸ за заказ «" + t.getTitle() + "»");
    }

    /** Gives the reserved money back (as points) to the requester. Does nothing if nothing is reserved. */
    public void refund(Task t, String note) {
        Optional<Payment> held = payments.findFirstByTaskIdAndStatusInOrderByIdDesc(t.getId(), HELD);
        if (held.isEmpty()) return;
        Payment p = held.get();
        User payer = wallet.lock(p.getPayer().getId());
        p.setStatus(PaymentStatus.REFUNDED);
        // an advance that is already with the runner cannot be taken back: only the rest returns
        int back = p.getAmount() - (p.isAdvanceReleased() ? p.getBudget() : 0);
        wallet.credit(payer, back, TxType.REFUND, t, note + " (заказ №" + t.getId() + ")");
        notifications.send(payer, NotificationService.PROFILE, "REFUND", t,
                "На баланс вернулось " + back + " ₸ по заказу «" + t.getTitle() + "»");
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
