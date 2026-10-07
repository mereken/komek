package com.komek.model;

import com.komek.util.TimeUtil;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/** A runner's response ("отклик") to an OPEN task, with the runner's own price. */
@Entity
@Table(name = "task_responses",
        uniqueConstraints = @UniqueConstraint(columnNames = {"task_id", "runner_id"}))
public class TaskResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(optional = false)
    @JoinColumn(name = "runner_id", nullable = false)
    private User runner;

    @Column(nullable = false)
    private Integer price;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = TimeUtil.now(); }

    public Long getId() { return id; }
    public Task getTask() { return task; }
    public void setTask(Task v) { this.task = v; }
    public User getRunner() { return runner; }
    public void setRunner(User v) { this.runner = v; }
    public Integer getPrice() { return price; }
    public void setPrice(Integer v) { this.price = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
