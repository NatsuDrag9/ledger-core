package com.ledger.core.exception;

import com.ledger.core.dto.TransactionResponse;

import lombok.Getter;

@Getter
public class IdempotencyReplayException extends RuntimeException {
    private final TransactionResponse response;

    public IdempotencyReplayException(TransactionResponse response) {
        this.response = response;
    }
}
