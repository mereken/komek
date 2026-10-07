package com.komek.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Введите телефон или e-mail") String login,
        @NotBlank(message = "Введите пароль") String password
) {}
