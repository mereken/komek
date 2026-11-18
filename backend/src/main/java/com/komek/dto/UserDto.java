package com.komek.dto;

import com.komek.model.Mode;
import com.komek.model.User;
import java.time.LocalDateTime;

/** What we send to the client. Never includes the password hash. */
public record UserDto(Long id, String fullName, String email, String phone, Mode mode,
                      LocalDateTime createdAt, Double rating, long ratingCount, boolean admin) {

    /** Without the admin flag (kept so existing code that builds a UserDto keeps compiling). */
    public UserDto(Long id, String fullName, String email, String phone, Mode mode,
                   LocalDateTime createdAt, Double rating, long ratingCount) {
        this(id, fullName, email, phone, mode, createdAt, rating, ratingCount, false);
    }

    /** Without rating (used right after sign-in; /api/users/me returns the full version). */
    public static UserDto from(User u) {
        return new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getMode(),
                u.getCreatedAt(), null, 0, u.isAdmin());
    }

    public UserDto withAdmin(boolean value) {
        return new UserDto(id, fullName, email, phone, mode, createdAt, rating, ratingCount, value);
    }
}
