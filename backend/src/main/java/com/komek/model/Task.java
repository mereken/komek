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

    /** "Where from": pickup point / shop. Used by the categories that have two addresses (null otherwise). */
    @Column(name = "from_location", length = 200)
    private String fromLocation;

    /** The main address. For two-address orders this is where to bring / leave the thing. */
    @Column(nullable = false, length = 200)
    private String location;

    /** Optional start of a time window ("from 19:00 to 20:00"). Null = just "by the deadline". */
    @Column(name = "start_at")
    private LocalDateTime startAt;

    /** The end of the window, or the "do it by" time when there is no window. */
    @Column(nullable = false)
    private LocalDateTime deadline;

    /** Entrance / floor / apartment / intercom / note for the first and the main address, as a small JSON text. */
    @Column(name = "from_details", length = 400)
    private String fromDetails;

    @Column(name = "location_details", length = 400)
    private String locationDetails;

    /** false = fixed price: runners respond at this price and cannot offer their own. */
    @Column(name = "allow_offers", columnDefinition = "boolean default true")
    private boolean allowOffers = true;

    /** Money the runner has to spend for the order (a purchase, cash on delivery). Not earnings, no commission. */
    @Column(columnDefinition = "integer default 0")
    private int budget;

    /** Grows with every edit; responders compare it with what they have seen. */
    @Column(name = "edit_version", columnDefinition = "integer default 0")
    private int editVersion;

    /** Human-readable summary of the last edit ("Время: ... → ...; Цена: ... → ..."). */
    @Column(name = "last_change", length = 500)
    private String lastChange;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    /** KZT. After the requester picks a runner this becomes the runner's offered price. */
    @Column(nullable = false)
    private Integer reward;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private TaskStatus status = TaskStatus.OPEN;

    /** 1-5, given by the requester to the runner after the task is DONE. */
    private Integer rating;

    /** 1-5, given by the runner to the requester after the task is DONE. */
    @Column(name = "requester_rating")
    private Integer requesterRating;

    /**
     * Set when the runner reports "work done". The status stays IN_PROGRESS until the requester confirms;
     * then it becomes DONE and the money is released. (A separate timestamp instead of a new status value,
     * because Hibernate keeps a check constraint on the existing status column.)
     */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

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
    public String getFromLocation() { return fromLocation; }
    public void setFromLocation(String v) { this.fromLocation = v; }
    public String getLocation() { return location; }
    public void setLocation(String v) { this.location = v; }
    public LocalDateTime getStartAt() { return startAt; }
    public void setStartAt(LocalDateTime v) { this.startAt = v; }
    public String getFromDetails() { return fromDetails; }
    public void setFromDetails(String v) { this.fromDetails = v; }
    public String getLocationDetails() { return locationDetails; }
    public void setLocationDetails(String v) { this.locationDetails = v; }
    public boolean isAllowOffers() { return allowOffers; }
    public void setAllowOffers(boolean v) { this.allowOffers = v; }
    public int getBudget() { return budget; }
    public void setBudget(int v) { this.budget = v; }
    public int getEditVersion() { return editVersion; }
    public void setEditVersion(int v) { this.editVersion = v; }
    public String getLastChange() { return lastChange; }
    public void setLastChange(String v) { this.lastChange = v; }
    public LocalDateTime getEditedAt() { return editedAt; }
    public void setEditedAt(LocalDateTime v) { this.editedAt = v; }
    public LocalDateTime getDeadline() { return deadline; }
    public void setDeadline(LocalDateTime v) { this.deadline = v; }
    public Integer getReward() { return reward; }
    public void setReward(Integer v) { this.reward = v; }
    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus v) { this.status = v; }
    public Integer getRequesterRating() { return requesterRating; }
    public void setRequesterRating(Integer v) { this.requesterRating = v; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime v) { this.completedAt = v; }
    public Integer getRating() { return rating; }
    public void setRating(Integer v) { this.rating = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
