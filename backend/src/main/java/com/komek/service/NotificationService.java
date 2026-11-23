package com.komek.service;

import com.komek.dto.NotifSummary;
import com.komek.dto.NotificationDto;
import com.komek.model.Notification;
import com.komek.model.Task;
import com.komek.model.User;
import com.komek.repo.NotificationRepository;
import com.komek.repo.TaskRepository;
import com.komek.util.TimeUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * In-app notifications ("+1" on the tabs, the bell list). Areas: ORDERS (requester side), TASKS (runner side),
 * PROFILE (money in the wallet). Besides unread news, the tabs also count finished orders that are not rated yet.
 */
@Service
@Transactional
public class NotificationService {
    public static final String ORDERS = "ORDERS";
    public static final String TASKS = "TASKS";
    public static final String PROFILE = "PROFILE";

    private static final int RATING_REMINDER_DAYS = 30;

    private final NotificationRepository repo;
    private final TaskRepository tasks;

    public NotificationService(NotificationRepository repo, TaskRepository tasks) {
        this.repo = repo;
        this.tasks = tasks;
    }

    public void send(User user, String area, String kind, Task task, String text) {
        Notification n = new Notification();
        n.setUser(user);
        n.setTask(task);
        n.setArea(area);
        n.setKind(kind);
        n.setText(text.length() > 300 ? text.substring(0, 300) : text);
        repo.save(n);
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> list(Long uid) {
        return repo.findTop50ByUserIdOrderByIdDesc(uid).stream()
                .map(n -> new NotificationDto(n.getId(), n.getKind(), n.getArea(),
                        n.getTask() == null ? null : n.getTask().getId(), n.getText(), n.getCreatedAt(),
                        n.getReadAt() != null))
                .toList();
    }

    @Transactional(readOnly = true)
    public NotifSummary summary(Long uid) {
        var since = TimeUtil.now().minusDays(RATING_REMINDER_DAYS);
        Set<Long> orders = new HashSet<>(repo.unreadTaskIds(uid, ORDERS));
        orders.addAll(tasks.toRateAsRequester(uid, since));
        Set<Long> work = new HashSet<>(repo.unreadTaskIds(uid, TASKS));
        work.addAll(tasks.toRateAsRunner(uid, since));
        return new NotifSummary(orders.size(), work.size(),
                repo.countByUserIdAndAreaAndReadAtIsNull(uid, PROFILE), repo.countByUserIdAndReadAtIsNull(uid));
    }

    @Transactional(readOnly = true)
    public long unreadForTask(Long uid, Long taskId) {
        return repo.countByUserIdAndTaskIdAndReadAtIsNull(uid, taskId);
    }

    public void markRead(Long uid, Long id) {
        repo.findById(id).filter(n -> n.getUser().getId().equals(uid)).ifPresent(n -> {
            if (n.getReadAt() == null) n.setReadAt(TimeUtil.now());
        });
    }

    public void markAllRead(Long uid) { repo.markAllRead(uid, TimeUtil.now()); }

    /** Opening an order marks its order/task news as read. */
    public void markTaskRead(Long uid, Long taskId) { repo.markTaskRead(uid, taskId, TimeUtil.now()); }

    /** Opening the wallet marks the money news as read. */
    public void markWalletRead(Long uid) { repo.markAreaRead(uid, PROFILE, TimeUtil.now()); }
}
