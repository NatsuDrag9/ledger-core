package com.ledger.core.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.boot.autoconfigure.data.web.SpringDataWebProperties.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.ledger.core.model.Transaction;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    // Return all transactions of a user id if it exists, null otherwise
    org.springframework.data.domain.Page<Transaction> findByUserId(UUID userId, Pageable pageable);

    // Return the transaction by user id and idempotency key if it exists, null otherwise
    Optional<Transaction> findByUserIdAndIdempotencyKey(UUID userId, String idempotencyKey);
} 
