package com.komek.web;

import com.komek.dto.AdminDtos.*;
import com.komek.model.TaskStatus;
import com.komek.service.AdminService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Admin panel API. Protected by SecurityConfig: only users with is_admin = true get in. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService admin;

    public AdminController(AdminService admin) { this.admin = admin; }

    @GetMapping("/stats")
    public Stats stats() { return admin.stats(); }

    @GetMapping("/users")
    public List<AdminUser> users(@RequestParam(name = "q", required = false) String q) { return admin.users(q); }

    @DeleteMapping("/users/{id}")
    public Ok deleteUser(Authentication auth, @PathVariable("id") Long id) {
        admin.deleteUser(Long.valueOf(auth.getName()), id);
        return new Ok(true);
    }

    @GetMapping("/tasks")
    public List<AdminTask> tasks(@RequestParam(name = "status", required = false) TaskStatus status) {
        return admin.tasks(status);
    }

    @PostMapping("/tasks/{id}/cancel")
    public Ok cancelTask(@PathVariable("id") Long id) {
        admin.cancelTask(id);
        return new Ok(true);
    }

    @DeleteMapping("/tasks/{id}")
    public Ok deleteTask(@PathVariable("id") Long id) {
        admin.deleteTask(id);
        return new Ok(true);
    }
}
