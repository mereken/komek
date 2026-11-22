package com.komek.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Link a bank card. Demo only: the number is checked for format, only the last 4 digits are kept. */
public record CardRequest(
        @NotBlank(message = "Введите номер карты") String cardNumber,
        @NotBlank(message = "Введите срок действия") String expiry,
        @Size(max = 60, message = "Имя на карте слишком длинное") String holder
) {}
