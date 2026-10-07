package com.komek.service;

import com.komek.dto.*;
import com.komek.model.Channel;
import com.komek.model.Mode;
import com.komek.model.User;
import com.komek.repo.UserRepository;
import com.komek.security.JwtService;
import com.komek.util.Contacts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final int RESEND_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 5;
    private static final Duration CODE_TTL = Duration.ofMinutes(10);

    /**
     * A registration that is waiting for its code. Kept in memory on purpose:
     * the MVP schema has only users and tasks. The user row is created after the code is confirmed.
     * (Restarting the backend drops pending registrations.)
     */
    private static class Pending {
        final String fullName, contact, passwordHash, code;
        final Channel channel;
        final Instant expiresAt;
        int attempts = 0;

        Pending(String fullName, String contact, String passwordHash, String code, Channel channel) {
            this.fullName = fullName;
            this.contact = contact;
            this.passwordHash = passwordHash;
            this.code = code;
            this.channel = channel;
            this.expiresAt = Instant.now().plus(CODE_TTL);
        }
    }

    private final Map<String, Pending> pending = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final boolean exposeCode;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt,
                       @Value("${app.otp.expose-code}") boolean exposeCode) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.exposeCode = exposeCode;
    }

    /** Step 1: validate data, generate a 6-digit code. */
    public StartResponse start(StartRequest r) {
        boolean byPhone = r.channel() == Channel.PHONE;
        String contact = byPhone ? Contacts.normalizePhone(r.contact()) : Contacts.normalizeEmail(r.contact());
        if (contact == null) {
            throw bad(byPhone ? "Введите номер в формате +7 701 234 56 78" : "Введите корректный e-mail");
        }
        boolean taken = byPhone ? users.existsByPhone(contact) : users.existsByEmail(contact);
        if (taken) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    byPhone ? "Этот номер уже зарегистрирован" : "Этот e-mail уже зарегистрирован");
        }

        Instant now = Instant.now();
        pending.values().removeIf(p -> now.isAfter(p.expiresAt)); // cleanup

        String code = String.format("%06d", random.nextInt(1_000_000));
        pending.put(contact, new Pending(r.fullName().trim(), contact, encoder.encode(r.password()), code, r.channel()));

        // TODO: send a real SMS / e-mail here when a provider is connected.
        log.info("[DEV] Verification code for {}: {}", contact, code);
        return new StartResponse(contact, RESEND_SECONDS, exposeCode ? code : null);
    }

    /** Step 2: check the code, create the user, return a token. */
    public AuthResponse verify(VerifyRequest r) {
        Pending p = pending.get(r.contact());
        if (p == null || Instant.now().isAfter(p.expiresAt)) {
            pending.remove(r.contact());
            throw bad("Код истёк. Запросите новый.");
        }
        if (!p.code.equals(r.code())) {
            if (++p.attempts >= MAX_ATTEMPTS) {
                pending.remove(r.contact());
                throw bad("Слишком много попыток. Запросите новый код.");
            }
            throw bad("Неверный код");
        }
        pending.remove(r.contact());

        boolean byPhone = p.channel == Channel.PHONE;
        if (byPhone ? users.existsByPhone(p.contact) : users.existsByEmail(p.contact)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Этот контакт уже зарегистрирован");
        }
        User u = new User();
        u.setFullName(p.fullName);
        u.setPasswordHash(p.passwordHash); // only the hash is stored
        if (byPhone) u.setPhone(p.contact); else u.setEmail(p.contact);
        u.setMode(Mode.REQUESTER); // default; the user picks the real mode on the next screen
        users.save(u);
        return new AuthResponse(jwt.generate(u), UserDto.from(u));
    }

    public AuthResponse login(LoginRequest r) {
        String login = r.login().trim();
        Optional<User> found = login.contains("@")
                ? users.findByEmail(login.toLowerCase())
                : Optional.ofNullable(Contacts.normalizePhone(login)).flatMap(users::findByPhone);

        User u = found
                .filter(x -> encoder.matches(r.password(), x.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Неверный логин или пароль. Проверьте раскладку или сбросьте пароль."));
        return new AuthResponse(jwt.generate(u), UserDto.from(u));
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
