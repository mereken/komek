package com.komek.dto;

import com.komek.model.PaymentMethod;
import com.komek.model.PaymentStatus;
import java.time.LocalDateTime;

/** Payment of an order as shown to both sides. */
public record PaymentInfoDto(PaymentStatus status, int amount, int commission, int payout,
                             PaymentMethod method, String cardLast4, LocalDateTime updatedAt) {}
