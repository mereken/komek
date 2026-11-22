package com.komek.model;

import com.komek.util.TimeUtil;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/** One row of the wallet history. amount is signed: + adds points, - takes them away. */
@Entity
@Table(name = "wallet_transactions")
public class WalletTx {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private TxType type;

    @Column(nullable = false)
    private long amount;

    @Column(name = "balance_after", nullable = false)
    private long balanceAfter;

    /** Related order, if any. */
    @ManyToOne
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(length = 160)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = TimeUtil.now(); }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User v) { this.user = v; }
    public TxType getType() { return type; }
    public void setType(TxType v) { this.type = v; }
    public long getAmount() { return amount; }
    public void setAmount(long v) { this.amount = v; }
    public long getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(long v) { this.balanceAfter = v; }
    public Task getTask() { return task; }
    public void setTask(Task v) { this.task = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
