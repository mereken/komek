package com.komek.dto;

import com.komek.model.Category;
import com.komek.model.Mode;
import com.komek.model.TaskStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Data for the admin panel. */
public final class AdminDtos {
    private AdminDtos() {}

    /** One day of the "last 14 days" chart. date is "2026-11-18". */
    public record DayPoint(String date, long users, long tasks) {}

    public record Stats(long users, long requesters, long runners, long admins, long newUsers7d,
                        long tasks, Map<String, Long> tasksByStatus, long tasks7d,
                        long responses, long doneReward, long commission, long held,
                        Double avgRating, long ratingCount, List<DayPoint> days) {}

    public record AdminUser(Long id, String fullName, String email, String phone, Mode mode, boolean admin,
                            LocalDateTime createdAt, long tasksAsRequester, long tasksAsRunner, long responses) {}

    public record AdminTask(Long id, String title, Category category, TaskStatus status, Integer reward,
                            String location, LocalDateTime deadline, LocalDateTime createdAt,
                            Long requesterId, String requesterName, Long runnerId, String runnerName,
                            long responses, String paymentStatus) {}

    public record Ok(boolean ok) {}
}
