package com.komek.dto;

import com.komek.model.Channel;
import jakarta.validation.constraints.*;

/** Step 1 of registration. */
public record StartRequest(
        @NotBlank(message = "Введите имя") @Size(max = 100, message = "Имя слишком длинное") String fullName,
        @NotNull(message = "Выберите телефон или e-mail") Channel channel,
        @NotBlank(message = "Введите номер телефона или e-mail") String contact,
        @NotBlank(message = "Введите пароль") @Size(min = 8, max = 72, message = "Пароль: от 8 до 72 символов") String password
) {}
