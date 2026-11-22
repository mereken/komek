package com.komek.dto;

import jakarta.validation.constraints.*;

public record PasswordChangeRequest(
        @NotBlank(message = "Введите текущий пароль") String currentPassword,
        @NotBlank(message = "Введите новый пароль")
        @Size(min = 8, max = 72, message = "Пароль: от 8 до 72 символов")
        @Pattern(regexp = "^(?=.*\\p{L})(?=.*\\d).*$", message = "В пароле должны быть буква и цифра") String newPassword
) {}
