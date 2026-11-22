package com.komek.service;

import com.komek.dto.*;
import com.komek.model.*;
import com.komek.repo.TaskRepository;
import com.komek.repo.TaskResponseRepository;
import com.komek.repo.UserRepository;
import com.komek.util.TimeUtil;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

import static com.komek.model.TaskStatus.*;

/**
 * Order life cycle:
 * OPEN -> (requester picks a runner) ACCEPTED -> (requester pays, money is reserved) -> (runner starts) IN_PROGRESS
 * -> (runner reports "done": completedAt is set) -> (requester confirms) DONE + payout. CANCELLED before the work starts.
 */
@Service
@Transactional
public class TaskService {
    private static final List<TaskStatus> ACTIVE = List.of(OPEN, ACCEPTED, IN_PROGRESS);
    private static final List<TaskStatus> FINISHED = List.of(DONE, CANCELLED);

    /** The deadline must be at least this far from now. */
    public static final int MIN_LEAD_MINUTES = 30;

    /** Categories with two addresses: "from where" and "to where". */
    private static final Set<Category> TWO_ADDRESSES = EnumSet.of(Category.PICKUP, Category.BUY);

    private final TaskRepository tasks;
    private final TaskResponseRepository responses;
    private final UserRepository users;
    private final PaymentService payments;

    public TaskService(TaskRepository tasks, TaskResponseRepository responses, UserRepository users,
                       PaymentService payments) {
        this.tasks = tasks;
        this.responses = responses;
        this.users = users;
        this.payments = payments;
    }

    // ---------------------------------------------------------------- requester

    public TaskDto create(Long uid, CreateTaskRequest r) {
        LocalDateTime earliest = TimeUtil.now().plusMinutes(MIN_LEAD_MINUTES);
        if (r.deadline().isBefore(earliest)) {
            throw bad("Срок выполнения должен быть не раньше чем через " + MIN_LEAD_MINUTES + " минут");
        }
        String from = r.fromLocation() == null ? "" : r.fromLocation().trim();
        if (TWO_ADDRESSES.contains(r.category()) && from.isEmpty()) {
            throw bad(r.category() == Category.BUY ? "Укажите, где купить" : "Укажите, откуда забрать");
        }
        boolean keepFrom = !from.isEmpty() && r.category() != Category.QUEUE && r.category() != Category.DOG_WALK;

        User requester = user(uid);
        requirePhone(requester);

        Task t = new Task();
        t.setRequester(requester);
        t.setCategory(r.category());
        String title = r.title() == null ? "" : r.title().trim();
        t.setTitle(title.isEmpty() ? r.category().getDefaultTitle() : title);
        t.setDescription(r.description() == null ? "" : r.description().trim());
        t.setFromLocation(keepFrom ? from : null);
        t.setLocation(r.location().trim());
        t.setDeadline(r.deadline());
        t.setReward(r.reward());
        return toDto(tasks.save(t), uid);
    }

    /** "active" = OPEN / ACCEPTED / IN_PROGRESS, "history" = DONE / CANCELLED. */
    @Transactional(readOnly = true)
    public List<TaskDto> mine(Long uid, String scope) {
        Collection<TaskStatus> st = "history".equals(scope) ? FINISHED : ACTIVE;
        return tasks.findByRequesterIdAndStatusInOrderByUpdatedAtDesc(uid, st).stream()
                .map(t -> toDto(t, uid)).toList();
    }

    /** Responses to my task, best rated first. */
    @Transactional(readOnly = true)
    public List<OfferDto> offers(Long uid, Long taskId) {
        Task t = find(taskId);
        requireOwner(t, uid);
        return responses.findByTaskId(taskId).stream()
                .map(r -> new OfferDto(r.getId(), person(r.getRunner(), false, false), r.getPrice(), r.getCreatedAt()))
                .sorted(Comparator.comparing((OfferDto o) -> o.runner().rating() == null ? -1.0 : o.runner().rating())
                        .reversed().thenComparing(OfferDto::price))
                .toList();
    }

    public TaskDto select(Long uid, Long taskId, Long offerId) {
        Task t = lock(taskId);
        requireOwner(t, uid);
        if (t.getStatus() != OPEN) throw bad("Исполнитель уже выбран или заказ закрыт");
        TaskResponse r = responses.findById(offerId)
                .filter(x -> x.getTask().getId().equals(taskId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Отклик не найден"));
        t.setRunner(r.getRunner());
        t.setReward(r.getPrice()); // the agreed price is the chosen runner's price
        t.setStatus(ACCEPTED);
        return toDto(tasks.save(t), uid);
    }

    /** The requester pays for the order. The money is reserved until the work is confirmed. */
    public PayResult pay(Long uid, Long taskId, PayRequest req) {
        Task t = lock(taskId);
        requireOwner(t, uid);
        if (t.getStatus() != ACCEPTED || t.getRunner() == null) {
            throw bad("Оплатить можно после того, как вы выберете исполнителя");
        }
        PaymentService.Outcome o = payments.pay(t, req);
        return new PayResult(o.ok(), o.message(), toDto(t, uid));
    }

    public TaskDto cancel(Long uid, Long taskId) {
        Task t = lock(taskId);
        requireOwner(t, uid);
        if (t.getStatus() != OPEN && t.getStatus() != ACCEPTED) throw bad("Заказ уже нельзя отменить");
        payments.refund(t, "Возврат: вы отменили заказ");
        t.setStatus(CANCELLED);
        return toDto(tasks.save(t), uid);
    }

    /** "Работа выполнена": the requester accepts the result, the runner gets the money. */
    public TaskDto confirm(Long uid, Long taskId) {
        Task t = lock(taskId);
        requireOwner(t, uid);
        if (t.getStatus() != IN_PROGRESS || t.getCompletedAt() == null) {
            throw bad("Исполнитель ещё не сообщил о выполнении");
        }
        t.setStatus(DONE);
        payments.release(t);
        return toDto(tasks.save(t), uid);
    }

    /** The requester rates the runner. */
    public TaskDto rate(Long uid, Long taskId, int rating) {
        Task t = find(taskId);
        requireOwner(t, uid);
        if (t.getStatus() != DONE) throw bad("Оценить можно только выполненный заказ");
        if (t.getRating() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Вы уже оценили исполнителя");
        t.setRating(rating);
        return toDto(tasks.save(t), uid);
    }

    // ------------------------------------------------------------------- runner

    @Transactional(readOnly = true)
    public List<TaskDto> feed(Long uid, String q, Category category) {
        String text = q == null ? "" : q.trim().toLowerCase().replace("%", "").replace("_", "");
        Collection<Category> cats = category == null ? EnumSet.allOf(Category.class) : List.of(category);
        return tasks.feed(OPEN, uid, TimeUtil.now(), cats, "%" + text + "%").stream()
                .map(t -> toDto(t, uid)).toList();
    }

    /** Runner's list: assigned tasks and my responses. Active = in work + pending responses. */
    @Transactional(readOnly = true)
    public List<WorkItemDto> work(Long uid, String scope) {
        boolean history = "history".equals(scope);
        List<WorkItemDto> out = new ArrayList<>();

        Collection<TaskStatus> st = history ? FINISHED : List.of(ACCEPTED, IN_PROGRESS);
        for (Task t : tasks.findByRunnerIdAndStatusInOrderByUpdatedAtDesc(uid, st)) {
            out.add(new WorkItemDto(toDto(t, uid), null, false));
        }
        for (TaskResponse r : responses.findByRunnerIdOrderByCreatedAtDesc(uid)) {
            Task t = r.getTask();
            boolean assignedToMe = t.getRunner() != null && t.getRunner().getId().equals(uid);
            if (assignedToMe) continue;               // already listed above
            boolean open = t.getStatus() == OPEN;
            if (open == history) continue;            // open -> active list, closed -> history list
            out.add(new WorkItemDto(toDto(t, uid), r.getPrice(), true));
        }
        return out;
    }

    public TaskDto respond(Long uid, Long taskId, OfferRequest req) {
        Task t = find(taskId);
        if (t.getRequester().getId().equals(uid)) throw bad("Нельзя откликнуться на свой заказ");
        if (t.getStatus() != OPEN) throw bad("Заказ уже не принимает отклики");
        if (!t.getDeadline().isAfter(TimeUtil.now())) throw bad("Срок заказа истёк");
        if (responses.findByTaskIdAndRunnerId(taskId, uid).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Вы уже откликнулись на этот заказ");
        }
        User runner = user(uid);
        requirePhone(runner);
        TaskResponse r = new TaskResponse();
        r.setTask(t);
        r.setRunner(runner);
        r.setPrice(req.price() == null ? t.getReward() : req.price());
        responses.save(r);
        return toDto(t, uid);
    }

    public TaskDto withdraw(Long uid, Long taskId) {
        Task t = find(taskId);
        if (t.getStatus() != OPEN) throw bad("Отозвать отклик уже нельзя");
        TaskResponse r = responses.findByTaskIdAndRunnerId(taskId, uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Отклик не найден"));
        responses.delete(r);
        return toDto(t, uid);
    }

    /** Starting is possible only after the requester has paid (the money is reserved). */
    public TaskDto start(Long uid, Long taskId) {
        Task t = lock(taskId);
        requireRunner(t, uid);
        if (t.getStatus() != ACCEPTED) throw bad("Начать можно только принятое задание");
        if (!payments.isHeld(taskId)) throw bad("Заказчик ещё не оплатил заказ. Начать можно после оплаты.");
        t.setStatus(IN_PROGRESS);
        return toDto(tasks.save(t), uid);
    }

    /** "Задание выполнено": waits for the requester's confirmation. The status stays IN_PROGRESS. */
    public TaskDto complete(Long uid, Long taskId) {
        Task t = lock(taskId);
        requireRunner(t, uid);
        if (t.getStatus() != IN_PROGRESS) throw bad("Завершить можно только задание в работе");
        if (t.getCompletedAt() != null) throw bad("Вы уже сообщили о выполнении. Ждём подтверждения заказчика.");
        t.setCompletedAt(TimeUtil.now());
        return toDto(tasks.save(t), uid);
    }

    /** The runner rates the requester. */
    public TaskDto rateRequester(Long uid, Long taskId, int rating) {
        Task t = find(taskId);
        requireRunner(t, uid);
        if (t.getStatus() != DONE) throw bad("Оценить можно только выполненный заказ");
        if (t.getRequesterRating() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Вы уже оценили заказчика");
        t.setRequesterRating(rating);
        return toDto(tasks.save(t), uid);
    }

    // ------------------------------------------------------------------- shared

    @Transactional(readOnly = true)
    public TaskDto get(Long uid, Long taskId) {
        Task t = find(taskId);
        boolean mine = t.getRequester().getId().equals(uid)
                || (t.getRunner() != null && t.getRunner().getId().equals(uid));
        if (!mine && t.getStatus() != OPEN && responses.findByTaskIdAndRunnerId(taskId, uid).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Заказ не найден");
        }
        return toDto(t, uid);
    }

    /** The signed-in user with both ratings, photo and balance (for /api/users/me). */
    @Transactional(readOnly = true)
    public UserDto userDto(User u) {
        Stat asRunner = stats(u.getId());
        Stat asRequester = requesterStats(u.getId());
        return new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getMode(), u.getCreatedAt(),
                asRunner.avg(), asRunner.count(), asRequester.avg(), asRequester.count(),
                u.isAdmin(), UserDto.avatarUrl(u.getAvatarKey()), u.getBalance());
    }

    // ------------------------------------------------------------------ helpers

    private TaskDto toDto(Task t, Long viewerId) {
        boolean owner = t.getRequester().getId().equals(viewerId);
        boolean viewerIsRunner = t.getRunner() != null && t.getRunner().getId().equals(viewerId);
        // Contacts are shared only between the two sides of an assigned task
        boolean shared = t.getStatus() == ACCEPTED || t.getStatus() == IN_PROGRESS || t.getStatus() == DONE;
        PersonDto requester = person(t.getRequester(), viewerIsRunner && shared, true);
        PersonDto runner = t.getRunner() == null ? null : person(t.getRunner(), owner && shared, false);
        Integer myPrice = responses.findByTaskIdAndRunnerId(t.getId(), viewerId).map(TaskResponse::getPrice).orElse(null);
        boolean awaiting = t.getStatus() == IN_PROGRESS && t.getCompletedAt() != null;
        int commission = payments.commissionOf(t.getReward());
        PaymentInfoDto payment = (owner || viewerIsRunner) ? payments.info(t.getId()) : null;
        return new TaskDto(t.getId(), t.getTitle(), t.getDescription(), t.getCategory(),
                t.getFromLocation(), t.getLocation(),
                t.getDeadline(), t.getReward(), t.getStatus(), t.getCreatedAt(), owner, requester, runner,
                responses.countByTaskId(t.getId()), myPrice, t.getRating(), t.getRequesterRating(),
                awaiting, payments.percent(), commission, t.getReward() - commission, payment);
    }

    /** asRequester: show the rating this person got as a requester (otherwise the one they got as a runner). */
    private PersonDto person(User u, boolean withContact, boolean asRequester) {
        Stat s = asRequester ? requesterStats(u.getId()) : stats(u.getId());
        long done = tasks.countByRunnerIdAndStatus(u.getId(), DONE);
        String contact = withContact ? (u.getPhone() != null ? u.getPhone() : u.getEmail()) : null;
        return new PersonDto(u.getId(), u.getFullName(), s.avg(), s.count(), done, contact,
                UserDto.avatarUrl(u.getAvatarKey()));
    }

    private record Stat(Double avg, long count) {}

    private Stat stats(Long uid) {
        return toStat(tasks.ratingStats(uid));
    }

    private Stat requesterStats(Long uid) {
        return toStat(tasks.requesterRatingStats(uid));
    }

    private static Stat toStat(List<Object[]> rows) {
        if (rows.isEmpty() || rows.get(0)[0] == null) return new Stat(null, 0);
        double avg = ((Number) rows.get(0)[0]).doubleValue();
        return new Stat(Math.round(avg * 10) / 10.0, ((Number) rows.get(0)[1]).longValue());
    }

    private Task find(Long id) {
        return tasks.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Заказ не найден"));
    }

    /** Same as find(), but with a row lock: used by every action that can move money or change the status. */
    private Task lock(Long id) {
        return tasks.lockById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Заказ не найден"));
    }

    private User user(Long id) {
        return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Пользователь не найден"));
    }

    /** The two sides talk by phone, so an order or a response needs a phone number in the profile. */
    private static void requirePhone(User u) {
        if (u.getPhone() == null) {
            throw bad("Добавьте номер телефона в профиле, чтобы с вами могли связаться");
        }
    }

    private void requireOwner(Task t, Long uid) {
        if (!t.getRequester().getId().equals(uid)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Это не ваш заказ");
    }

    private void requireRunner(Task t, Long uid) {
        if (t.getRunner() == null || !t.getRunner().getId().equals(uid)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Это не ваше задание");
        }
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
