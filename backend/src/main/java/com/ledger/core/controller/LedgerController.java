package com.ledger.core.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.ledger.core.dto.TransactionRequest;
import com.ledger.core.dto.TransactionResponse;
import com.ledger.core.dto.UserRequest;
import com.ledger.core.dto.UserResponse;
import com.ledger.core.service.LedgerService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/ledger")
@RequiredArgsConstructor
public class LedgerController {
    private final LedgerService ledgerService;

    // List all user profiles
    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(ledgerService.getAllUsers());
    }

    // Get current logged-in user profile
    @GetMapping("/users/profile")
    public ResponseEntity<UserResponse> getUserProfile(@RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(ledgerService.getUserProfile(userId));
    }

    // Create new user profile
    @PostMapping("/users")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ledgerService.createUser(request.getUsername()));
    }

    // Get paginated transaction history
    // Using a custom header of user-id until jwt authentication is implemented
    @GetMapping("/transactions")
    public ResponseEntity<Page<TransactionResponse>> getTransactions(@RequestHeader("X-User-Id") UUID userId, @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ledgerService.getTransactions(userId, pageable));
    }

    // Create a new transaction
    @PostMapping("/transactions")
    public ResponseEntity<TransactionResponse>
    createTransaction(@RequestHeader("X-User-Id") UUID userId, @Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ledgerService.createTransaction(userId, request));
    }
}
