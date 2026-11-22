package com.komek.dto;

import com.komek.model.TxType;
import java.time.LocalDateTime;
import java.util.List;

public record WalletDto(long balance, int commissionPercent, boolean testMode, CardDto card, List<TxDto> transactions) {

    public record CardDto(String brand, String last4, String holder, String expiry) {}

    public record TxDto(Long id, TxType type, long amount, long balanceAfter, Long taskId, String note,
                        LocalDateTime createdAt) {}
}
