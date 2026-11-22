package com.komek.dto;

import jakarta.validation.constraints.*;

/** Top-up or withdrawal. simulateFail = demo "bank declines" switch (top-up only, test mode only). */
public record AmountRequest(
        @NotNull(message = "Укажите сумму")
        @Min(value = 100, message = "Минимальная сумма — 100")
        @Max(value = 1000000, message = "Слишком большая сумма") Integer amount,
        Boolean simulateFail
) {}
