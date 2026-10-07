package com.komek.model;

import com.komek.util.TimeUtil;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    /** Empty while the task is OPEN. */
    @ManyToOne
    @JoinColumn(name = "runner_id")
    private User runner;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Category category;

    @Column(nullable = false, length = 200)
    private String location;

    @Column(nullable = false)
    private LocalDateTime deadline;

    /** KZT. After the requester picks a runner this becomes the runner's offered price. */
    @Column(nullable = false)
    private Integer reward;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private TaskStatus status = TaskStatus.OPEN;

    /** 1-5, given by the requester to the runner after the task is DONE. */
    private Integer rating;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() { createdAt = TimeUtil.now(); updatedAt = createdAt; }

    @PreUpdate
    void onUpdate() { updatedAt = TimeUtil.now(); }

    public Long getId() { return id; }
    public User getRequester() { return requester; }
    public void setRequester(User v) { this.requester = v; }
    public User getRunner() { return runner; }
    public void setRunner(User v) { this.runner = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
    public Category getCategory() { return category; }
    public void setCategory(Category v) { this.category = v; }
    public String getLocation() { return location; }
    public void setLocation(String v) { this.location = v; }
    public LocalDateTime getDeadline() { return deadline; }
    public void setDeadline(LocalDateTime v) { this.deadline = v; }
    public Integer getReward() { return reward; }
    public void setReward(Integer v) { this.reward = v; }
    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus v) { this.status = v; }
    public Integer getRating() { return rating; }
    public void setRating(Integer v) { this.rating = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
