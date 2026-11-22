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
 *   pay()     requester pays -> PAID: the money is reserved for the order
 *   release() requester confirmed the work -> RELEASED: runner gets the payout, the platform keeps the commission
 *   refund()  order cancelled before the work is accepted -> REFUNDED: the points go back to the requester's balance
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
    private final int percent;
    private final boolean testMode;

    public PaymentService(PaymentRepository payments, WalletService wallet,
                          @Value("${app.commission-percent}") int percent,
                          @Value("${app.payments.test-mode}") boolean testMode) {
        this.payments = payments;
        this.wallet = wallet;
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
                        p.getMethod(), p.getCardLast4(), p.getUpdatedAt()))
                .orElse(null);
    }

    // ------------------------------------------------------------------ pay

    public Outcome pay(Task t, PayRequest r) {
        if (isHeld(t.getId())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Заказ уже оплачен");
        int amount = t.getReward();
        User payer = wallet.lock(t.getRequester().getId());

        Payment p = new Payment();
        p.setTask(t);
        p.setPayer(payer);
        p.setPayee(t.getRunner());
        p.setAmount(amount);
        p.setCommission(commissionOf(amount));
        p.setPayout(amount - p.getCommission());
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

    /** The requester confirmed the work: the runner gets the payout, the commission stays with the platform. */
    public void release(Task t) {
        Optional<Payment> held = payments.findFirstByTaskIdAndStatusInOrderByIdDesc(t.getId(), HELD);
        if (held.isEmpty()) return; // order from before payments existed: nothing to pay out
        Payment p = held.get();
        User runner = wallet.lock(p.getPayee().getId());
        p.setStatus(PaymentStatus.RELEASED);
        wallet.credit(runner, p.getPayout(), TxType.PAYOUT, t,
                "Оплата за заказ №" + t.getId() + " «" + t.getTitle() + "» (комиссия " + percent + "%: " + p.getCommission() + " ₸)");
    }

    /** Gives the reserved money back (as points) to the requester. Does nothing if nothing is reserved. */
    public void refund(Task t, String note) {
        Optional<Payment> held = payments.findFirstByTaskIdAndStatusInOrderByIdDesc(t.getId(), HELD);
        if (held.isEmpty()) return;
        Payment p = held.get();
        User payer = wallet.lock(p.getPayer().getId());
        p.setStatus(PaymentStatus.REFUNDED);
        wallet.credit(payer, p.getAmount(), TxType.REFUND, t, note + " (заказ №" + t.getId() + ")");
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
