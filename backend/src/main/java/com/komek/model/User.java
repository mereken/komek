package com.komek.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users") // "user" is a reserved word in PostgreSQL
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // BIGSERIAL
    private Long id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    // Nullable: a user who registered by phone has no e-mail (and vice versa).
    // PostgreSQL allows many NULLs in a UNIQUE column.
    @Column(unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(unique = true, length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Mode mode = Mode.REQUESTER;

    /** Random part of the public photo URL; null = no photo. The image itself lives in the avatars table. */
    @Column(name = "avatar_key", length = 40)
    private String avatarKey;

    /** Wallet balance in points (1 point = 1 tenge). Change only through WalletService. */
    @Column(columnDefinition = "bigint default 0")
    private long balance;

    // Saved bank card. Demo only: we keep just the display data, never the full number or CVC.
    @Column(name = "card_last4", length = 4)
    private String cardLast4;

    @Column(name = "card_brand", length = 20)
    private String cardBrand;

    @Column(name = "card_holder", length = 60)
    private String cardHolder;

    @Column(name = "card_expiry", length = 5)
    private String cardExpiry;

    // Admin flag. Set by hand in the database: UPDATE users SET is_admin = true WHERE id = ...
    @Column(name = "is_admin", columnDefinition = "boolean default false")
    private boolean admin;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = com.komek.util.TimeUtil.now(); }

    public Long getId() { return id; }
    public String getFullName() { return fullName; }
    public void setFullName(String v) { this.fullName = v; }
    public String getEmail() { return email; }
    public void setEmail(String v) { this.email = v; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String v) { this.passwordHash = v; }
    public String getPhone() { return phone; }
    public void setPhone(String v) { this.phone = v; }
    public Mode getMode() { return mode; }
    public void setMode(Mode v) { this.mode = v; }
    public boolean isAdmin() { return admin; }
    public String getAvatarKey() { return avatarKey; }
    public void setAvatarKey(String v) { this.avatarKey = v; }
    public long getBalance() { return balance; }
    public void setBalance(long v) { this.balance = v; }
    public String getCardLast4() { return cardLast4; }
    public void setCardLast4(String v) { this.cardLast4 = v; }
    public String getCardBrand() { return cardBrand; }
    public void setCardBrand(String v) { this.cardBrand = v; }
    public String getCardHolder() { return cardHolder; }
    public void setCardHolder(String v) { this.cardHolder = v; }
    public String getCardExpiry() { return cardExpiry; }
    public void setCardExpiry(String v) { this.cardExpiry = v; }
    public boolean hasCard() { return cardLast4 != null; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
