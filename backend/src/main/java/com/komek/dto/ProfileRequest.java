package com.komek.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProfileRequest(
        @NotBlank(message = "Введите имя") @Size(min = 2, max = 100, message = "Имя: от 2 до 100 символов") String fullName
) {}
