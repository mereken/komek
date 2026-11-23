package com.komek.dto;

import com.komek.model.PaymentMethod;
import com.komek.model.PaymentStatus;
import java.time.LocalDateTime;

/**
 * Payment of an order as shown to both sides. amount = reward + budget (what the requester paid);
 * commission and payout are about the reward only; budget is the advance for expenses.
 */
public record PaymentInfoDto(PaymentStatus status, int amount, int commission, int payout,
                             int budget, boolean advanceReleased,
                             PaymentMethod method, String cardLast4, LocalDateTime updatedAt) {}
