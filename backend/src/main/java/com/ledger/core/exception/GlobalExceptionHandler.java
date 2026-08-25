package com.ledger.core.exception;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.ledger.core.dto.TransactionResponse;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Handle replayed requests (returns 200 OK + Idempotency-Replay header)
    @ExceptionHandler(IdempotencyReplayException.class)
    public ResponseEntity<TransactionResponse>
        handleIdempotencyReplay(IdempotencyReplayException ex, HttpServletRequest request) {
            return ResponseEntity.status(HttpStatus.OK)
                .header("Idempotency-Replay", "true")
                .body(ex.getResponse());
        }

    // Handle balance validation errors (returns 422 unprocessable entity)
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleInsufficientBalance(IllegalStateException ex) {
        Map<String, String> errorBody = new HashMap<>();
        errorBody.put("error", ex.getMessage());

        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(errorBody);
    }

    // Handler user/profile missing errors (returns 404)
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(IllegalArgumentException ex) {
        Map<String, String> errorBody = new HashMap<>();
        errorBody.put("error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody);
    }

    // Handle DTO payload validation errors (returns 400 Bad request)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();

            errors.put(fieldName, errorMessage);
            
        });
        return ResponseEntity.badRequest().body(errors);
    }
}
