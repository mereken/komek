package com.komek.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CodeRequest(
        @NotBlank(message = "Введите код") @Pattern(regexp = "\\d{6}", message = "Код состоит из 6 цифр") String code
) {}
