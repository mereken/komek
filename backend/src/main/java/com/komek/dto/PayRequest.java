package com.komek.dto;

import com.komek.model.PaymentMethod;
import jakarta.validation.constraints.NotNull;

/**
 * Pay for an order. method CARD: either the saved card (useSavedCard + cvc) or a new one (cardNumber, expiry, cvc).
 * simulateFail is the demo "bank declines" switch; it works only while app.payments.test-mode=true.
 */
public record PayRequest(
        @NotNull(message = "Выберите способ оплаты") PaymentMethod method,
        Boolean useSavedCard,
        String cardNumber,
        String expiry,
        String cvc,
        Boolean saveCard,
        Boolean simulateFail
) {}
