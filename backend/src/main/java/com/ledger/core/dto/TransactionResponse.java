package com.ledger.core.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.ledger.core.model.Transaction;
import com.ledger.core.model.TransactionType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionResponse {
    private UUID id;
    private UUID userId;
    private BigDecimal amount;
    private TransactionType type;
    private BigDecimal balanceAfter;
    private LocalDateTime createdAt;

    // Add builder with from
    public static TransactionResponse fromEntity(Transaction tx) {
        return TransactionResponse.builder().id(tx.getId()).userId(tx.getUser().getId()).amount(tx.getAmount()).type(tx.getType()).balanceAfter(tx.getBalanceAfter()).createdAt(tx.getCreatedAt()).build();
    }
}
