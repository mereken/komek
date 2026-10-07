package com.komek.dto;

import jakarta.validation.constraints.*;

public record RateRequest(
        @NotNull(message = "Поставьте оценку") @Min(value = 1, message = "Оценка от 1 до 5") @Max(value = 5, message = "Оценка от 1 до 5") Integer rating
) {}
