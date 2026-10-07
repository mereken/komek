package com.komek.dto;

import jakarta.validation.constraints.*;

public record VerifyRequest(
        @NotBlank(message = "Не указан контакт") String contact,
        @NotBlank(message = "Введите код") @Pattern(regexp = "\\d{6}", message = "Код состоит из 6 цифр") String code
) {}
