package com.komek.web;

import com.komek.dto.AdminDtos.Ok;
import com.komek.dto.AvatarRequest;
import com.komek.dto.ModeRequest;
import com.komek.dto.PasswordChangeRequest;
import com.komek.dto.ProfileRequest;
import com.komek.dto.UserDto;
import com.komek.model.User;
import com.komek.repo.UserRepository;
import com.komek.service.AvatarService;
import com.komek.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserRepository users;
    private final TaskService tasks;
    private final AvatarService avatars;
    private final PasswordEncoder encoder;

    public UserController(UserRepository users, TaskService tasks, AvatarService avatars, PasswordEncoder encoder) {
        this.users = users;
        this.tasks = tasks;
        this.avatars = avatars;
        this.encoder = encoder;
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

    /** Edit profile: the name. */
    @PatchMapping("/me")
    public UserDto updateProfile(Authentication auth, @Valid @RequestBody ProfileRequest req) {
        User u = current(auth);
        u.setFullName(req.fullName().trim());
        return tasks.userDto(users.save(u));
    }

    @PutMapping("/me/avatar")
    public UserDto setAvatar(Authentication auth, @Valid @RequestBody AvatarRequest req) {
        avatars.save(current(auth).getId(), req.image());
        return tasks.userDto(current(auth));
    }

    @DeleteMapping("/me/avatar")
    public UserDto removeAvatar(Authentication auth) {
        avatars.remove(current(auth).getId());
        return tasks.userDto(current(auth));
    }

    @PostMapping("/me/password")
    public Ok changePassword(Authentication auth, @Valid @RequestBody PasswordChangeRequest req) {
        User u = current(auth);
        if (!encoder.matches(req.currentPassword(), u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Текущий пароль указан неверно");
        }
        if (req.currentPassword().equals(req.newPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Новый пароль совпадает с текущим");
        }
        u.setPasswordHash(encoder.encode(req.newPassword()));
        users.save(u);
        return new Ok(true);
    }

    private User current(Authentication auth) {
        return users.findById(Long.valueOf(auth.getName()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Пользователь не найден"));
    }
}
