package com.komek.model;

import com.komek.util.TimeUtil;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Payment for one order (demo: no real bank). amount = commission + payout. */
@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(optional = false)
    @JoinColumn(name = "payer_id", nullable = false)
    private User payer;

    @ManyToOne(optional = false)
    @JoinColumn(name = "payee_id", nullable = false)
    private User payee;

    @Column(nullable = false)
    private int amount;

    /** The platform's share, kept when the money is released to the runner. */
    @Column(nullable = false)
    private int commission;

    /** What the runner receives: amount - commission. */
    @Column(nullable = false)
    private int payout;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PaymentMethod method;

    @Column(name = "card_last4", length = 4)
    private String cardLast4;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PaymentStatus status;

    @Column(name = "fail_reason", length = 200)
    private String failReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() { createdAt = TimeUtil.now(); updatedAt = createdAt; }

    @PreUpdate
    void onUpdate() { updatedAt = TimeUtil.now(); }

    public Long getId() { return id; }
    public Task getTask() { return task; }
    public void setTask(Task v) { this.task = v; }
    public User getPayer() { return payer; }
    public void setPayer(User v) { this.payer = v; }
    public User getPayee() { return payee; }
    public void setPayee(User v) { this.payee = v; }
    public int getAmount() { return amount; }
    public void setAmount(int v) { this.amount = v; }
    public int getCommission() { return commission; }
    public void setCommission(int v) { this.commission = v; }
    public int getPayout() { return payout; }
    public void setPayout(int v) { this.payout = v; }
    public PaymentMethod getMethod() { return method; }
    public void setMethod(PaymentMethod v) { this.method = v; }
    public String getCardLast4() { return cardLast4; }
    public void setCardLast4(String v) { this.cardLast4 = v; }
    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus v) { this.status = v; }
    public String getFailReason() { return failReason; }
    public void setFailReason(String v) { this.failReason = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
