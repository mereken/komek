package com.komek.dto;

import jakarta.validation.constraints.NotBlank;

/** Add or change the phone number of the signed-in user (a code is sent to it first). */
public record PhoneRequest(@NotBlank(message = "Введите номер телефона") String phone) {}
