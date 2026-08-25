package com.ledger.core.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ledger.core.dto.TransactionRequest;
import com.ledger.core.dto.TransactionResponse;
import com.ledger.core.dto.UserResponse;
import com.ledger.core.model.Transaction;
import com.ledger.core.model.TransactionType;
import com.ledger.core.model.User;
import com.ledger.core.repository.TransactionRepository;
import com.ledger.core.repository.UserRepository;


import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LedgerService {
    
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public UserResponse getUserProfile(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));

        return UserResponse.fromEntity(user);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserResponse createUser(String username) {
        if(userRepository.findAll().stream().anyMatch(u -> u.getUsername().equalsIgnoreCase(username))) {
            throw new IllegalArgumentException("Username already exists");
        }
        
        User user = User.builder().username(username).balance(BigDecimal.ZERO).build();

        return UserResponse.fromEntity(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactions(UUID userId, Pageable pageable) {
        if(!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("User not found");
        }

        return transactionRepository.findByUserId(userId, pageable).map(tx -> TransactionResponse.fromEntity(tx, false));
    }

    @Transactional
    public TransactionResponse createTransaction(UUID userId, TransactionRequest request, boolean disableLocking) {
        User user;
        if(disableLocking) {
            // Bypass lock (normal select query on SQL)
            user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));

            // Artificial delay to simulate concurrent load - threads overlap
            try {
                Thread.sleep(100);
            }
            catch(InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        else {
            // Acquire lock for the USER (SELECT FOR UPDATE)
            user = userRepository.findByIdForUpdateOptional(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        }

        // Check idempotency key inside lock
        var existingTx = transactionRepository.findByUserIdAndIdempotencyKey(userId, request.getIdempotencyKey());
        // Get existing row if present
        if(existingTx.isPresent()) {
            throw new com.ledger.core.exception.IdempotencyReplayException(
                TransactionResponse.fromEntity(existingTx.get(), true)
            );
        }

        // Check balance invariant
        BigDecimal newBalance;
        if(request.getType() == TransactionType.DEBIT) {
            if(user.getBalance().compareTo(request.getAmount()) < 0) {
                throw new IllegalStateException("Insufficient balance");
            }

            newBalance = user.getBalance().subtract(request.getAmount());
        } else {
            newBalance = user.getBalance().add(request.getAmount());
        }

        // Update user balance
        user.setBalance(newBalance);
        userRepository.save(user);

        // Create transaction in the DB
        Transaction tx = Transaction.builder()
            .user(user)
            .type(request.getType())
            .amount(request.getAmount())
            .idempotencyKey(request.getIdempotencyKey())
            .balanceAfter(newBalance)
            .build();

        return TransactionResponse.fromEntity(transactionRepository.save(tx), false);
    }

}
