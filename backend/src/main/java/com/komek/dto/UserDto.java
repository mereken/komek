package com.komek.dto;

import com.komek.model.Mode;
import com.komek.model.User;
import java.time.LocalDateTime;

/**
 * What we send to the signed-in user about themselves. Never includes the password hash.
 * rating = as a runner (rated by requesters), requesterRating = as a requester (rated by runners).
 */
public record UserDto(Long id, String fullName, String email, String phone, Mode mode,
                      LocalDateTime createdAt, Double rating, long ratingCount,
                      Double requesterRating, long requesterRatingCount,
                      boolean admin, String avatarUrl, long balance) {

    /** Without ratings (used right after sign-in; /api/users/me returns the full version). */
    public static UserDto from(User u) {
        return new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getMode(),
                u.getCreatedAt(), null, 0, null, 0, u.isAdmin(), avatarUrl(u.getAvatarKey()), u.getBalance());
    }

    /** Public URL of a profile photo, or null when there is none. */
    public static String avatarUrl(String key) {
        return key == null ? null : "/api/avatars/" + key;
    }
}
