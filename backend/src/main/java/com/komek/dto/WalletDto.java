package com.komek.dto;

import com.komek.model.TxType;
import java.time.LocalDateTime;
import java.util.List;

/** earned = everything paid out for finished orders (without advances for expenses). */
public record WalletDto(long balance, long earned, int commissionPercent, boolean testMode, CardDto card,
                        List<TxDto> transactions) {

    public record CardDto(String brand, String last4, String holder, String expiry) {}

    /** advance = the runner's advance for expenses (requester's money, not earnings). */
    public record TxDto(Long id, TxType type, long amount, long balanceAfter, Long taskId, String note,
                        boolean advance, LocalDateTime createdAt) {}
}
