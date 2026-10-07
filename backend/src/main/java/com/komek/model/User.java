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
    public LocalDateTime getCreatedAt() { return createdAt; }
}
