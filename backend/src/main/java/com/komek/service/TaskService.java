package com.komek.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.time.format.DateTimeFormatter;
import java.util.*;

import static com.komek.model.TaskStatus.*;

/**
 * Order life cycle:
 * OPEN -> (requester picks a runner) ACCEPTED -> (requester pays reward + budget, money is reserved)
 * -> (runner starts; the budget is handed over as an advance) IN_PROGRESS
 * -> (runner reports "done": completedAt is set) -> (requester confirms) DONE + payout of reward - commission.
 * CANCELLED before the work starts. An order can be edited only while it is OPEN.
 */
@Service
@Transactional
public class TaskService {
    private static final List<TaskStatus> ACTIVE = List.of(OPEN, ACCEPTED, IN_PROGRESS);
    private static final List<TaskStatus> FINISHED = List.of(DONE, CANCELLED);

    /** The deadline (or the start of a window) must be at least this far from now. */
    public static final int MIN_LEAD_MINUTES = 30;
    /** A time window must be at least this long and at most MAX_WINDOW_HOURS. */
    public static final int MIN_WINDOW_MINUTES = 15;
    public static final int MAX_WINDOW_HOURS = 24;
    /** Smallest amount for "money for expenses". */
    private static final int MIN_BUDGET = 100;

    /** Categories that always have two addresses: "from where" and "to where". The others may have one or two. */
    private static final Set<Category> TWO_ADDRESSES = EnumSet.of(Category.PICKUP, Category.BUY);

    private static final DateTimeFormatter DAY_TIME = DateTimeFormatter.ofPattern("dd.MM HH:mm");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final ObjectMapper JSON = new ObjectMapper();

    private final TaskRepository tasks;
    private final TaskResponseRepository responses;
    private final UserRepository users;
    private final PaymentService payments;
    private final NotificationService notifications;

    public TaskService(TaskRepository tasks, TaskResponseRepository responses, UserRepository users,
                       PaymentService payments, NotificationService notifications) {
        this.tasks = tasks;
        this.responses = responses;
        this.users = users;
        this.payments = payments;
        this.notifications = notifications;
    }

    // ---------------------------------------------------------------- requester

    public TaskDto create(Long uid, CreateTaskRequest r) {
        User requester = user(uid);
        requirePhone(requester);
        Task t = new Task();
        t.setRequester(requester);
        apply(t, r);
        return toDto(tasks.save(t), uid);
    }

    /** Edit an order. Possible only while it is OPEN (before a runner is chosen); responders get a notice. */
    public TaskDto update(Long uid, Long taskId, CreateTaskRequest r) {
        Task t = lock(taskId);
        requireOwner(t, uid);
        if (t.getStatus() != OPEN) throw bad("Изменить заказ можно, пока не выбран исполнитель");

        Snap before = new Snap(t);
        apply(t, r);
        List<String> changes = diff(before, t);
        if (changes.isEmpty()) return toDto(t, uid);

        t.setEditVersion(t.getEditVersion() + 1);
        String summary = String.join("; ", changes);
        t.setLastChange(summary.length() > 480 ? summary.substring(0, 480) : summary);
        t.setEditedAt(TimeUtil.now());

        List<TaskResponse> list = responses.findByTaskId(taskId);
        for (TaskResponse resp : list) {
            // a fixed price applies to everyone who has already responded
            if (!t.isAllowOffers()) resp.setPrice(t.getReward());
            notifications.send(resp.getRunner(), NotificationService.TASKS, "EDITED", t,
                    "Заказ «" + t.getTitle() + "» изменён: " + t.getLastChange());
        }
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

        for (TaskResponse other : responses.findByTaskId(taskId)) {
            boolean chosen = other.getId().equals(r.getId());
            notifications.send(other.getRunner(), NotificationService.TASKS, chosen ? "CHOSEN" : "NOT_CHOSEN", t,
                    chosen ? "Вас выбрали исполнителем: «" + t.getTitle() + "». Ждите оплату от заказчика."
                           : "Заказчик выбрал другого исполнителя: «" + t.getTitle() + "»");
        }
        return toDto(tasks.save(t), uid);
    }

    /** The requester pays for the order (reward + money for expenses). The money is reserved until the work is confirmed. */
    public PayResult pay(Long uid, Long taskId, PayRequest req) {
        Task t = lock(taskId);
        requireOwner(t, uid);
        if (t.getStatus() != ACCEPTED || t.getRunner() == null) {
            throw bad("Оплатить можно после того, как вы выберете исполнителя");
        }
        PaymentService.Outcome o = payments.pay(t, req);
        if (o.ok()) {
            notifications.send(t.getRunner(), NotificationService.TASKS, "PAID", t,
                    "Заказ «" + t.getTitle() + "» оплачен, деньги зарезервированы. Можно начинать.");
        }
        return new PayResult(o.ok(), o.message(), toDto(t, uid));
    }

    public TaskDto cancel(Long uid, Long taskId) {
        Task t = lock(taskId);
        requireOwner(t, uid);
        if (t.getStatus() != OPEN && t.getStatus() != ACCEPTED) throw bad("Заказ уже нельзя отменить");
        payments.refund(t, "Возврат: вы отменили заказ");
        t.setStatus(CANCELLED);
        // everyone who responded (or was chosen) is told
        for (TaskResponse resp : responses.findByTaskId(taskId)) {
            notifications.send(resp.getRunner(), NotificationService.TASKS, "CANCELLED", t,
                    "Заказчик отменил заказ «" + t.getTitle() + "»");
        }
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
        notifications.send(t.getRunner(), NotificationService.TASKS, "CONFIRMED", t,
                "Заказчик подтвердил выполнение «" + t.getTitle() + "». Оцените заказчика.");
        return toDto(tasks.save(t), uid);
    }

    /** The requester rates the runner. */
    public TaskDto rate(Long uid, Long taskId, int rating) {
        Task t = find(taskId);
        requireOwner(t, uid);
        if (t.getStatus() != DONE) throw bad("Оценить можно только выполненный заказ");
        if (t.getRating() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Вы уже оценили исполнителя");
        t.setRating(rating);
        notifications.send(t.getRunner(), NotificationService.TASKS, "RATED", t,
                "Заказчик оценил вас на " + rating + " из 5 («" + t.getTitle() + "»)"
                        + (t.getRequesterRating() == null ? ". Оцените заказчика в ответ." : ""));
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

        int price;
        if (t.isAllowOffers()) {
            price = req.price() == null ? t.getReward() : req.price();
        } else {
            if (req.price() != null && !req.price().equals(t.getReward())) {
                throw bad("Заказчик указал фиксированную цену: " + t.getReward() + " ₸");
            }
            price = t.getReward();
        }

        TaskResponse r = new TaskResponse();
        r.setTask(t);
        r.setRunner(runner);
        r.setPrice(price);
        r.setSeenVersion(t.getEditVersion());
        responses.save(r);
        notifications.send(t.getRequester(), NotificationService.ORDERS, "NEW_RESPONSE", t,
                runner.getFullName() + " откликнулся на «" + t.getTitle() + "» за " + price + " ₸");
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

    /** Starting is possible only after the requester has paid. The money for expenses is handed over as an advance. */
    public TaskDto start(Long uid, Long taskId) {
        Task t = lock(taskId);
        requireRunner(t, uid);
        if (t.getStatus() != ACCEPTED) throw bad("Начать можно только принятое задание");
        if (!payments.isHeld(taskId)) throw bad("Заказчик ещё не оплатил заказ. Начать можно после оплаты.");
        t.setStatus(IN_PROGRESS);
        payments.releaseAdvance(t);
        notifications.send(t.getRequester(), NotificationService.ORDERS, "STARTED", t,
                "Исполнитель приступил к заказу «" + t.getTitle() + "»");
        return toDto(tasks.save(t), uid);
    }

    /** "Задание выполнено": waits for the requester's confirmation. The status stays IN_PROGRESS. */
    public TaskDto complete(Long uid, Long taskId) {
        Task t = lock(taskId);
        requireRunner(t, uid);
        if (t.getStatus() != IN_PROGRESS) throw bad("Завершить можно только задание в работе");
        if (t.getCompletedAt() != null) throw bad("Вы уже сообщили о выполнении. Ждём подтверждения заказчика.");
        t.setCompletedAt(TimeUtil.now());
        notifications.send(t.getRequester(), NotificationService.ORDERS, "WORK_DONE", t,
                "Исполнитель сообщил, что «" + t.getTitle() + "» выполнен. Проверьте и подтвердите.");
        return toDto(tasks.save(t), uid);
    }

    /** The runner rates the requester. */
    public TaskDto rateRequester(Long uid, Long taskId, int rating) {
        Task t = find(taskId);
        requireRunner(t, uid);
        if (t.getStatus() != DONE) throw bad("Оценить можно только выполненный заказ");
        if (t.getRequesterRating() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Вы уже оценили заказчика");
        t.setRequesterRating(rating);
        notifications.send(t.getRequester(), NotificationService.ORDERS, "RATED", t,
                "Исполнитель оценил вас на " + rating + " из 5 («" + t.getTitle() + "»)"
                        + (t.getRating() == null ? ". Оцените исполнителя в ответ." : ""));
        return toDto(tasks.save(t), uid);
    }

    // ------------------------------------------------------------------- shared

    /** Opening an order marks its news as read and, for a runner, the edits as seen. */
    public TaskDto get(Long uid, Long taskId) {
        Task t = find(taskId);
        boolean mine = t.getRequester().getId().equals(uid)
                || (t.getRunner() != null && t.getRunner().getId().equals(uid));
        Optional<TaskResponse> myResponse = responses.findByTaskIdAndRunnerId(taskId, uid);
        if (!mine && t.getStatus() != OPEN && myResponse.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Заказ не найден");
        }
        TaskDto dto = toDto(t, uid); // built first, so the "changed" / "new" marks are still in it
        myResponse.ifPresent(r -> r.setSeenVersion(t.getEditVersion()));
        notifications.markTaskRead(uid, taskId);
        return dto;
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

    // ------------------------------------------------- create / edit: validation

    /** Validates the request and copies it into the task (used for both a new and an edited order). */
    private void apply(Task t, CreateTaskRequest r) {
        LocalDateTime earliest = TimeUtil.now().plusMinutes(MIN_LEAD_MINUTES);
        LocalDateTime start = r.startAt();
        if (start != null) {
            if (start.isBefore(earliest)) throw bad("Начало должно быть не раньше чем через " + MIN_LEAD_MINUTES + " минут");
            if (r.deadline().isBefore(start.plusMinutes(MIN_WINDOW_MINUTES))) {
                throw bad("Конец промежутка должен быть позже начала минимум на " + MIN_WINDOW_MINUTES + " минут");
            }
            if (r.deadline().isAfter(start.plusHours(MAX_WINDOW_HOURS))) {
                throw bad("Промежуток не может быть длиннее " + MAX_WINDOW_HOURS + " часов");
            }
        } else if (r.deadline().isBefore(earliest)) {
            throw bad("Срок выполнения должен быть не раньше чем через " + MIN_LEAD_MINUTES + " минут");
        }

        String from = r.fromLocation() == null ? "" : r.fromLocation().trim();
        if (TWO_ADDRESSES.contains(r.category()) && from.isEmpty()) {
            throw bad(r.category() == Category.BUY ? "Укажите, где купить" : "Укажите, откуда забрать");
        }

        int budget = r.budget() == null ? 0 : r.budget();
        if (r.category() == Category.DOG_WALK) budget = 0; // nothing to buy on a dog walk
        if (r.category() == Category.BUY && budget < MIN_BUDGET) {
            throw bad("Укажите, сколько денег нужно на покупку (от " + MIN_BUDGET + " ₸)");
        }
        if (budget != 0 && budget < MIN_BUDGET) throw bad("Деньги на расходы: от " + MIN_BUDGET + " ₸");

        String title = r.title() == null ? "" : r.title().trim();
        t.setCategory(r.category());
        t.setTitle(title.isEmpty() ? r.category().getDefaultTitle() : title);
        t.setDescription(r.description() == null ? "" : r.description().trim());
        t.setFromLocation(from.isEmpty() ? null : from);
        t.setFromDetails(from.isEmpty() ? null : cleanDetails(r.fromDetails()));
        t.setLocation(r.location().trim());
        t.setLocationDetails(cleanDetails(r.locationDetails()));
        t.setStartAt(start);
        t.setDeadline(r.deadline());
        t.setReward(r.reward());
        t.setBudget(budget);
        t.setAllowOffers(r.allowOffers() == null || r.allowOffers());
    }

    /** Address details are a small JSON object written by the app ({"entrance":"2","floor":"4",...}). */
    private static String cleanDetails(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String s = raw.trim();
        try {
            JsonNode n = JSON.readTree(s);
            if (!n.isObject() || n.isEmpty()) return null;
        } catch (Exception e) {
            throw bad("Некорректные подробности адреса");
        }
        return s.length() > 400 ? s.substring(0, 400) : s;
    }

    // ------------------------------------------------------- edit: what changed

    private record Snap(String title, Category category, String from, String fromDetails, String location,
                        String locationDetails, LocalDateTime start, LocalDateTime deadline, int reward, int budget,
                        boolean allowOffers, String description) {
        Snap(Task t) {
            this(t.getTitle(), t.getCategory(), t.getFromLocation(), t.getFromDetails(), t.getLocation(),
                    t.getLocationDetails(), t.getStartAt(), t.getDeadline(), t.getReward(), t.getBudget(),
                    t.isAllowOffers(), t.getDescription());
        }
    }

    private static List<String> diff(Snap o, Task n) {
        List<String> c = new ArrayList<>();
        if (!Objects.equals(o.title, n.getTitle())) c.add("Название: «" + n.getTitle() + "»");
        if (o.category != n.getCategory()) c.add("Категория изменена");
        if (!Objects.equals(o.from, n.getFromLocation())) c.add("Откуда: " + (n.getFromLocation() == null ? "не указано" : n.getFromLocation()));
        if (!Objects.equals(o.location, n.getLocation())) c.add("Адрес: " + n.getLocation());
        if (!Objects.equals(o.fromDetails, n.getFromDetails()) || !Objects.equals(o.locationDetails, n.getLocationDetails())) {
            c.add("Подробности адреса изменены");
        }
        if (!Objects.equals(o.start, n.getStartAt()) || !o.deadline.equals(n.getDeadline())) {
            c.add("Время: " + when(o.start, o.deadline) + " → " + when(n.getStartAt(), n.getDeadline()));
        }
        if (o.reward != n.getReward()) c.add("Цена: " + money(o.reward) + " → " + money(n.getReward()));
        if (o.budget != n.getBudget()) c.add("Деньги на расходы: " + money(o.budget) + " → " + money(n.getBudget()));
        if (o.allowOffers != n.isAllowOffers()) c.add(n.isAllowOffers() ? "Можно предлагать свою цену" : "Цена фиксированная");
        if (!Objects.equals(o.description, n.getDescription())) c.add("Описание изменено");
        return c;
    }

    private static String when(LocalDateTime start, LocalDateTime end) {
        return start == null ? "до " + end.format(DAY_TIME) : start.format(DAY_TIME) + "–" + end.format(TIME);
    }

    private static String money(int v) {
        return String.format(Locale.ROOT, "%,d", v).replace(',', ' ') + " ₸";
    }

    // ------------------------------------------------------------------ helpers

    private TaskDto toDto(Task t, Long viewerId) {
        boolean owner = t.getRequester().getId().equals(viewerId);
        boolean viewerIsRunner = t.getRunner() != null && t.getRunner().getId().equals(viewerId);
        // Contacts and address details are shared only between the two sides of an assigned task
        boolean shared = t.getStatus() == ACCEPTED || t.getStatus() == IN_PROGRESS || t.getStatus() == DONE;
        boolean seesDetails = owner || (viewerIsRunner && shared);
        PersonDto requester = person(t.getRequester(), viewerIsRunner && shared, true);
        PersonDto runner = t.getRunner() == null ? null : person(t.getRunner(), owner && shared, false);
        Optional<TaskResponse> mine = responses.findByTaskIdAndRunnerId(t.getId(), viewerId);
        Integer myPrice = mine.map(TaskResponse::getPrice).orElse(null);
        boolean changed = t.getStatus() == OPEN && mine.map(r -> r.getSeenVersion() < t.getEditVersion()).orElse(false);
        boolean awaiting = t.getStatus() == IN_PROGRESS && t.getCompletedAt() != null;
        int commission = payments.commissionOf(t.getReward());
        PaymentInfoDto payment = (owner || viewerIsRunner) ? payments.info(t.getId()) : null;
        return new TaskDto(t.getId(), t.getTitle(), t.getDescription(), t.getCategory(),
                t.getFromLocation(), seesDetails ? t.getFromDetails() : null,
                t.getLocation(), seesDetails ? t.getLocationDetails() : null,
                t.getStartAt(), t.getDeadline(), t.getReward(), t.getBudget(), t.isAllowOffers(),
                t.getStatus(), t.getCreatedAt(), owner, requester, runner,
                responses.countByTaskId(t.getId()), myPrice, t.getRating(), t.getRequesterRating(),
                awaiting, payments.percent(), commission, t.getReward() - commission, payment,
                changed, t.getLastChange(), t.getEditedAt(), notifications.unreadForTask(viewerId, t.getId()));
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
