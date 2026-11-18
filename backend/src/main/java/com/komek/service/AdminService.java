package com.komek.service;

import com.komek.dto.AdminDtos.*;
import com.komek.model.Mode;
import com.komek.model.Task;
import com.komek.model.TaskStatus;
import com.komek.model.User;
import com.komek.repo.TaskRepository;
import com.komek.repo.UserRepository;
import com.komek.util.TimeUtil;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional
public class AdminService {
    private static final int DAYS = 14;
    private static final int TASK_LIMIT = 300;

    private final EntityManager em;
    private final UserRepository users;
    private final TaskRepository tasks;

    public AdminService(EntityManager em, UserRepository users, TaskRepository tasks) {
        this.em = em;
        this.users = users;
        this.tasks = tasks;
    }

    // ------------------------------------------------------------------ dashboard

    @Transactional(readOnly = true)
    public Stats stats() {
        LocalDateTime now = TimeUtil.now();
        LocalDateTime weekAgo = now.minusDays(7);

        long userCount = count("select count(u) from User u");
        long requesters = countWith("select count(u) from User u where u.mode = :v", Mode.REQUESTER);
        long runners = countWith("select count(u) from User u where u.mode = :v", Mode.RUNNER);
        long admins = count("select count(u) from User u where u.admin = true");
        long newUsers = countWith("select count(u) from User u where u.createdAt >= :v", weekAgo);

        long taskCount = count("select count(t) from Task t");
        long newTasks = countWith("select count(t) from Task t where t.createdAt >= :v", weekAgo);
        long responseCount = count("select count(r) from TaskResponse r");

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (TaskStatus s : TaskStatus.values()) byStatus.put(s.name(), 0L);
        for (Object[] row : em.createQuery("select t.status, count(t) from Task t group by t.status", Object[].class)
                .getResultList()) {
            byStatus.put(((TaskStatus) row[0]).name(), (Long) row[1]);
        }

        Number reward = em.createQuery("select coalesce(sum(t.reward), 0L) from Task t where t.status = :v", Number.class)
                .setParameter("v", TaskStatus.DONE).getSingleResult();

        Double avg = em.createQuery("select avg(t.rating) from Task t where t.rating is not null", Double.class)
                .getSingleResult();
        long ratingCount = count("select count(t) from Task t where t.rating is not null");
        Double avgRounded = avg == null ? null : Math.round(avg * 10.0) / 10.0;

        return new Stats(userCount, requesters, runners, admins, newUsers, taskCount, byStatus, newTasks,
                responseCount, reward.longValue(), avgRounded, ratingCount, lastDays(now));
    }

    /** New users and new tasks per day for the last 14 days (today included). */
    private List<DayPoint> lastDays(LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        LocalDate first = today.minusDays(DAYS - 1);
        LocalDateTime from = first.atStartOfDay();

        Map<LocalDate, Long> u = new HashMap<>();
        for (LocalDateTime t : em.createQuery("select u.createdAt from User u where u.createdAt >= :v", LocalDateTime.class)
                .setParameter("v", from).getResultList()) {
            u.merge(t.toLocalDate(), 1L, Long::sum);
        }
        Map<LocalDate, Long> k = new HashMap<>();
        for (LocalDateTime t : em.createQuery("select t.createdAt from Task t where t.createdAt >= :v", LocalDateTime.class)
                .setParameter("v", from).getResultList()) {
            k.merge(t.toLocalDate(), 1L, Long::sum);
        }

        List<DayPoint> out = new ArrayList<>();
        for (int i = 0; i < DAYS; i++) {
            LocalDate d = first.plusDays(i);
            out.add(new DayPoint(d.toString(), u.getOrDefault(d, 0L), k.getOrDefault(d, 0L)));
        }
        return out;
    }

    // ---------------------------------------------------------------------- users

    @Transactional(readOnly = true)
    public List<AdminUser> users(String q) {
        Map<Long, Long> asRequester = countMap("select t.requester.id, count(t) from Task t group by t.requester.id");
        Map<Long, Long> asRunner = countMap(
                "select t.runner.id, count(t) from Task t where t.runner is not null group by t.runner.id");
        Map<Long, Long> responses = countMap("select r.runner.id, count(r) from TaskResponse r group by r.runner.id");

        String needle = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        String digits = needle.replaceAll("\\D", "");

        List<AdminUser> out = new ArrayList<>();
        for (User u : users.findAll(Sort.by(Sort.Direction.DESC, "id"))) {
            if (!needle.isEmpty() && !matches(u, needle, digits)) continue;
            out.add(new AdminUser(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getMode(), u.isAdmin(),
                    u.getCreatedAt(), asRequester.getOrDefault(u.getId(), 0L),
                    asRunner.getOrDefault(u.getId(), 0L), responses.getOrDefault(u.getId(), 0L)));
        }
        return out;
    }

    private static boolean matches(User u, String needle, String digits) {
        if (u.getFullName().toLowerCase(Locale.ROOT).contains(needle)) return true;
        if (u.getEmail() != null && u.getEmail().toLowerCase(Locale.ROOT).contains(needle)) return true;
        return digits.length() >= 3 && u.getPhone() != null && u.getPhone().replaceAll("\\D", "").contains(digits);
    }

    /** Deletes the user together with everything that points at them (see the warning in the admin UI). */
    public void deleteUser(Long adminId, Long id) {
        if (adminId.equals(id)) throw bad("Нельзя удалить самого себя");
        User u = users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
        if (u.isAdmin()) throw bad("Нельзя удалить администратора. Сначала снимите флаг is_admin в базе.");

        em.createQuery("delete from TaskResponse r where r.runner.id = :id or r.task.id in "
                        + "(select t.id from Task t where t.requester.id = :id or t.runner.id = :id)")
                .setParameter("id", id).executeUpdate();
        em.createQuery("delete from Task t where t.requester.id = :id or t.runner.id = :id")
                .setParameter("id", id).executeUpdate();
        em.createQuery("delete from User u where u.id = :id").setParameter("id", id).executeUpdate();
        em.clear();
    }

    // ---------------------------------------------------------------------- tasks

    @Transactional(readOnly = true)
    public List<AdminTask> tasks(TaskStatus status) {
        Map<Long, Long> responses = countMap("select r.task.id, count(r) from TaskResponse r group by r.task.id");
        List<AdminTask> out = new ArrayList<>();
        for (Task t : tasks.findAll(Sort.by(Sort.Direction.DESC, "id"))) {
            if (status != null && t.getStatus() != status) continue;
            User rq = t.getRequester();
            User rn = t.getRunner();
            out.add(new AdminTask(t.getId(), t.getTitle(), t.getCategory(), t.getStatus(), t.getReward(),
                    t.getLocation(), t.getDeadline(), t.getCreatedAt(),
                    rq.getId(), rq.getFullName(),
                    rn == null ? null : rn.getId(), rn == null ? null : rn.getFullName(),
                    responses.getOrDefault(t.getId(), 0L)));
            if (out.size() >= TASK_LIMIT) break;
        }
        return out;
    }

    public void cancelTask(Long id) {
        Task t = tasks.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Заказ не найден"));
        if (t.getStatus() == TaskStatus.DONE || t.getStatus() == TaskStatus.CANCELLED) {
            throw bad("Заказ уже завершён");
        }
        t.setStatus(TaskStatus.CANCELLED);
        tasks.save(t);
    }

    public void deleteTask(Long id) {
        if (!tasks.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Заказ не найден");
        em.createQuery("delete from TaskResponse r where r.task.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("delete from Task t where t.id = :id").setParameter("id", id).executeUpdate();
        em.clear();
    }

    // -------------------------------------------------------------------- helpers

    private long count(String jpql) {
        return em.createQuery(jpql, Long.class).getSingleResult();
    }

    private long countWith(String jpql, Object value) {
        return em.createQuery(jpql, Long.class).setParameter("v", value).getSingleResult();
    }

    /** Query that returns rows of [id, count]. */
    private Map<Long, Long> countMap(String jpql) {
        Map<Long, Long> m = new HashMap<>();
        for (Object[] row : em.createQuery(jpql, Object[].class).getResultList()) {
            m.put((Long) row[0], (Long) row[1]);
        }
        return m;
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
