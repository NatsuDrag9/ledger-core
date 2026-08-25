package com.ledger.core.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable=false, unique=true, length=50)
    private String username;

    @Column(nullable=false, precision = 12, scale = 2)
    private BigDecimal balance;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if(createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        if(balance == null) {
            balance = BigDecimal.ZERO;
        }
    }
}