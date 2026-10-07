package com.komek.web;

import com.komek.dto.*;
import com.komek.model.Category;
import com.komek.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService service;

    public TaskController(TaskService service) { this.service = service; }

    private static Long uid(Authentication a) { return Long.valueOf(a.getName()); }

    // requester
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskDto create(Authentication a, @Valid @RequestBody CreateTaskRequest r) { return service.create(uid(a), r); }

    @GetMapping("/mine")
    public List<TaskDto> mine(Authentication a, @RequestParam(defaultValue = "active") String scope) {
        return service.mine(uid(a), scope);
    }

    @GetMapping("/{id}/responses")
    public List<OfferDto> offers(Authentication a, @PathVariable Long id) { return service.offers(uid(a), id); }

    @PostMapping("/{id}/responses/{offerId}/select")
    public TaskDto select(Authentication a, @PathVariable Long id, @PathVariable Long offerId) {
        return service.select(uid(a), id, offerId);
    }

    @PostMapping("/{id}/cancel")
    public TaskDto cancel(Authentication a, @PathVariable Long id) { return service.cancel(uid(a), id); }

    @PostMapping("/{id}/rating")
    public TaskDto rate(Authentication a, @PathVariable Long id, @Valid @RequestBody RateRequest r) {
        return service.rate(uid(a), id, r.rating());
    }

    // runner
    @GetMapping("/feed")
    public List<TaskDto> feed(Authentication a, @RequestParam(required = false) String q,
                              @RequestParam(required = false) Category category) {
        return service.feed(uid(a), q, category);
    }

    @GetMapping("/work")
    public List<WorkItemDto> work(Authentication a, @RequestParam(defaultValue = "active") String scope) {
        return service.work(uid(a), scope);
    }

    @PostMapping("/{id}/responses")
    public TaskDto respond(Authentication a, @PathVariable Long id, @Valid @RequestBody OfferRequest r) {
        return service.respond(uid(a), id, r);
    }

    @DeleteMapping("/{id}/responses/me")
    public TaskDto withdraw(Authentication a, @PathVariable Long id) { return service.withdraw(uid(a), id); }

    @PostMapping("/{id}/start")
    public TaskDto start(Authentication a, @PathVariable Long id) { return service.start(uid(a), id); }

    @PostMapping("/{id}/complete")
    public TaskDto complete(Authentication a, @PathVariable Long id) { return service.complete(uid(a), id); }

    // both
    @GetMapping("/{id}")
    public TaskDto get(Authentication a, @PathVariable Long id) { return service.get(uid(a), id); }
}
