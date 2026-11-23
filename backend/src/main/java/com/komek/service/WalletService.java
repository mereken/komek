package com.komek.service;

import com.komek.dto.AmountRequest;
import com.komek.dto.CardRequest;
import com.komek.dto.WalletDto;
import com.komek.dto.WalletDto.CardDto;
import com.komek.dto.WalletDto.TxDto;
import com.komek.model.Task;
import com.komek.model.TxType;
import com.komek.model.User;
import com.komek.model.WalletTx;
import com.komek.repo.UserRepository;
import com.komek.repo.WalletTxRepository;
import com.komek.util.Cards;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

/**
 * Wallet: the user's balance in points (1 point = 1 tenge) and its history.
 * Every change of a balance goes through credit()/debit() on a row-locked user.
 * The bank is simulated: topping up and withdrawing only move points, no real money.
 */
@Service
@Transactional
public class WalletService {
    private final UserRepository users;
    private final WalletTxRepository txs;
    private final int commissionPercent;
    private final boolean testMode;

    public WalletService(UserRepository users, WalletTxRepository txs,
                         @Value("${app.commission-percent}") int commissionPercent,
                         @Value("${app.payments.test-mode}") boolean testMode) {
        this.users = users;
        this.txs = txs;
        this.commissionPercent = commissionPercent;
        this.testMode = testMode;
    }

    public int commissionPercent() { return commissionPercent; }

    public boolean testMode() { return testMode; }

    @Transactional(readOnly = true)
    public WalletDto wallet(Long uid) {
        User u = users.findById(uid).orElseThrow(WalletService::noUser);
        List<TxDto> history = txs.findTop50ByUserIdOrderByIdDesc(uid).stream()
                .map(t -> new TxDto(t.getId(), t.getType(), t.getAmount(), t.getBalanceAfter(),
                        t.getTask() == null ? null : t.getTask().getId(), t.getNote(), t.isAdvance(), t.getCreatedAt()))
                .toList();
        long earned = txs.sumOwn(uid, TxType.PAYOUT);
        CardDto card = u.hasCard() ? new CardDto(u.getCardBrand(), u.getCardLast4(), u.getCardHolder(), u.getCardExpiry()) : null;
        return new WalletDto(u.getBalance(), earned, commissionPercent, testMode, card, history);
    }

    // ---------------------------------------------------------------------- card

    public WalletDto saveCard(Long uid, CardRequest r) {
        String digits = Cards.digits(r.cardNumber());
        if (!Cards.validNumber(digits)) throw bad("Номер карты: 16 цифр");
        String expiry = Cards.normalizeExpiry(r.expiry());
        if (expiry == null) throw bad("Срок действия в формате ММ/ГГ, например 08/28");
        if (Cards.expired(expiry)) throw bad("Срок действия карты истёк");
        User u = lock(uid);
        attachCard(u, digits, expiry, r.holder());
        return wallet(uid);
    }

    public WalletDto removeCard(Long uid) {
        User u = lock(uid);
        u.setCardLast4(null);
        u.setCardBrand(null);
        u.setCardHolder(null);
        u.setCardExpiry(null);
        return wallet(uid);
    }

    /** Keeps only what is needed to show the card: brand, last 4 digits, holder, expiry. */
    void attachCard(User u, String digits, String expiry, String holder) {
        u.setCardLast4(digits.substring(digits.length() - 4));
        u.setCardBrand(Cards.brand(digits));
        u.setCardExpiry(expiry);
        String h = holder == null ? "" : holder.trim().toUpperCase(Locale.ROOT);
        u.setCardHolder(h.isEmpty() ? null : h);
    }

    // ------------------------------------------------------- top-up / withdrawal

    public WalletDto topUp(Long uid, AmountRequest r) {
        User u = lock(uid);
        if (!u.hasCard()) throw bad("Сначала привяжите карту");
        if (testMode && Boolean.TRUE.equals(r.simulateFail())) {
            throw bad("Банк отклонил платёж, деньги не списаны (тестовый сценарий).");
        }
        credit(u, r.amount(), TxType.TOPUP, null, "Пополнение с карты •••• " + u.getCardLast4());
        return wallet(uid);
    }

    public WalletDto withdraw(Long uid, AmountRequest r) {
        User u = lock(uid);
        if (!u.hasCard()) throw bad("Сначала привяжите карту, на которую выводить");
        debit(u, r.amount(), TxType.WITHDRAWAL, null, "Вывод на карту •••• " + u.getCardLast4());
        return wallet(uid);
    }

    // --------------------------------------------------- used by PaymentService

    /** Loads the user with a row lock. Use the returned entity for credit()/debit(). */
    User lock(Long uid) {
        return users.lockById(uid).orElseThrow(WalletService::noUser);
    }

    void credit(User u, long amount, TxType type, Task task, String note) {
        credit(u, amount, type, task, note, false);
    }

    /** advance = true marks the runner's advance for expenses (not earnings). */
    void credit(User u, long amount, TxType type, Task task, String note, boolean advance) {
        u.setBalance(u.getBalance() + amount);
        record(u, type, amount, task, note, advance);
    }

    void debit(User u, long amount, TxType type, Task task, String note) {
        if (u.getBalance() < amount) throw bad("Недостаточно баллов на балансе");
        u.setBalance(u.getBalance() - amount);
        record(u, type, -amount, task, note, false);
    }

    private void record(User u, TxType type, long signedAmount, Task task, String note, boolean advance) {
        WalletTx t = new WalletTx();
        t.setUser(u);
        t.setType(type);
        t.setAmount(signedAmount);
        t.setBalanceAfter(u.getBalance());
        t.setTask(task);
        t.setNote(note != null && note.length() > 160 ? note.substring(0, 160) : note);
        t.setAdvance(advance);
        txs.save(t);
    }

    private static ResponseStatusException noUser() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Пользователь не найден");
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
