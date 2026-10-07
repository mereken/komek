package com.komek.web;

import com.komek.dto.ModeRequest;
import com.komek.dto.UserDto;
import com.komek.model.User;
import com.komek.repo.UserRepository;
import com.komek.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserRepository users;
    private final TaskService tasks;

    public UserController(UserRepository users, TaskService tasks) {
        this.users = users;
        this.tasks = tasks;
    }

    @GetMapping("/me")
    public UserDto me(Authentication auth) { return tasks.userDto(current(auth)); }

    /** Used by the "What do you want to do?" screen and by the profile switch. */
    @PatchMapping("/me/mode")
    public UserDto setMode(Authentication auth, @Valid @RequestBody ModeRequest req) {
        User u = current(auth);
        u.setMode(req.mode());
        return tasks.userDto(users.save(u));
    }

    private User current(Authentication auth) {
        return users.findById(Long.valueOf(auth.getName()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Пользователь не найден"));
    }
}
