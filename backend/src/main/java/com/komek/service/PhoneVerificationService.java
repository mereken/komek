package com.komek.service;

import com.komek.dto.StartResponse;
import com.komek.model.User;
import com.komek.repo.UserRepository;
import com.komek.util.Contacts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Adds (or changes) the phone number of a signed-in user. Needed for people who registered by e-mail:
 * the two sides of an order talk by phone. The number is saved only after the 6-digit code is confirmed.
 * Like the registration code, it is kept in memory (a backend restart drops waiting codes)
 * and shown on screen while app.otp.expose-code=true (no SMS provider yet).
 */
@Service
public class PhoneVerificationService {
    private static final Logger log = LoggerFactory.getLogger(PhoneVerificationService.class);
    private static final int RESEND_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 5;
    private static final Duration CODE_TTL = Duration.ofMinutes(10);

    private static class Pending {
        final String phone;
        final String code;
        final Instant sentAt = Instant.now();
        final Instant expiresAt = sentAt.plus(CODE_TTL);
        int attempts = 0;

        Pending(String phone, String code) {
            this.phone = phone;
            this.code = code;
        }
    }

    private final Map<Long, Pending> pending = new ConcurrentHashMap<>(); // key = user id
    private final SecureRandom random = new SecureRandom();
    private final UserRepository users;
    private final boolean exposeCode;

    public PhoneVerificationService(UserRepository users, @Value("${app.otp.expose-code}") boolean exposeCode) {
        this.users = users;
        this.exposeCode = exposeCode;
    }

    /** Step 1: check the number, generate a code. */
    public StartResponse start(Long uid, String raw) {
        String phone = Contacts.normalizePhone(raw);
        if (phone == null || !phone.matches("^\\+7[67]\\d{9}$")) {
            throw bad("Введите номер в формате +7 (7XX) XXX-XX-XX");
        }
        User me = users.findById(uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Пользователь не найден"));
        if (phone.equals(me.getPhone())) throw bad("Этот номер уже указан в вашем профиле");
        if (users.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Этот номер уже используется другим аккаунтом");
        }

        Instant now = Instant.now();
        pending.values().removeIf(p -> now.isAfter(p.expiresAt)); // cleanup
        Pending old = pending.get(uid);
        if (old != null && old.phone.equals(phone) && now.isBefore(old.sentAt.plusSeconds(RESEND_SECONDS))) {
            long wait = Duration.between(now, old.sentAt.plusSeconds(RESEND_SECONDS)).toSeconds() + 1;
            throw bad("Код уже отправлен. Запросить новый можно через " + wait + " с");
        }

        String code = String.format("%06d", random.nextInt(1_000_000));
        pending.put(uid, new Pending(phone, code));
        // TODO: send a real SMS here when a provider is connected.
        log.info("[DEV] Phone confirmation code for user {} ({}): {}", uid, phone, code);
        return new StartResponse(phone, RESEND_SECONDS, exposeCode ? code : null);
    }

    /** Step 2: check the code and save the number. Returns the updated user. */
    @Transactional
    public User verify(Long uid, String code) {
        Pending p = pending.get(uid);
        if (p == null || Instant.now().isAfter(p.expiresAt)) {
            pending.remove(uid);
            throw bad("Код истёк. Запросите новый.");
        }
        if (!p.code.equals(code)) {
            if (++p.attempts >= MAX_ATTEMPTS) {
                pending.remove(uid);
                throw bad("Слишком много попыток. Запросите новый код.");
            }
            throw bad("Неверный код");
        }
        pending.remove(uid);

        if (users.existsByPhone(p.phone)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Этот номер уже используется другим аккаунтом");
        }
        User me = users.findById(uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Пользователь не найден"));
        me.setPhone(p.phone);
        return users.save(me);
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
