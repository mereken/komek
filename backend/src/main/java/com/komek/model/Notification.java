package com.komek.model;

import com.komek.util.TimeUtil;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Something that happened and the user has not seen yet. area decides which tab shows the +N:
 * ORDERS (requester side), TASKS (runner side), PROFILE (wallet money). kind and area are plain text on purpose.
 */
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(nullable = false, length = 10)
    private String area;

    @Column(nullable = false, length = 30)
    private String kind;

    @Column(nullable = false, length = 300)
    private String text;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @PrePersist
    void onCreate() { createdAt = TimeUtil.now(); }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User v) { this.user = v; }
    public Task getTask() { return task; }
    public void setTask(Task v) { this.task = v; }
    public String getArea() { return area; }
    public void setArea(String v) { this.area = v; }
    public String getKind() { return kind; }
    public void setKind(String v) { this.kind = v; }
    public String getText() { return text; }
    public void setText(String v) { this.text = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime v) { this.readAt = v; }
}
