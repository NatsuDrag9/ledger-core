package com.ledger.core.dto;

import java.math.BigDecimal;
import java.util.UUID;

import com.ledger.core.model.User;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private UUID id;
    private String username;
    private BigDecimal balance;

    public static UserResponse fromEntity(User user) {
        return UserResponse.builder().id(user.getId()).username(user.getUsername()).balance(user.getBalance()).build();
    }
}
