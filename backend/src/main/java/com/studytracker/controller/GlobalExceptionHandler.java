package com.studytracker.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Illegal argument request error: {}", ex.getMessage());
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getMessage());
        // For conflicts like "Email đã được đăng ký", we return CONFLICT (409)
        HttpStatus status = HttpStatus.BAD_REQUEST;
        if (ex.getMessage() != null && 
            (ex.getMessage().toLowerCase().contains("already exists") || 
             ex.getMessage().toLowerCase().contains("đã được đăng ký"))) {
            status = HttpStatus.CONFLICT;
        }
        return ResponseEntity.status(status).body(response);
    }

    @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
    public ResponseEntity<Map<String, String>> handleBadCredentialsException(Exception ex) {
        log.warn("Authentication failed due to invalid credentials: {}", ex.getMessage());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Email hoặc mật khẩu không chính xác.");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, String>> handleAuthenticationException(AuthenticationException ex) {
        log.warn("Authentication error: {}", ex.getMessage());
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getMessage() != null ? ex.getMessage() : "Xác thực không thành công.");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        log.warn("Validation error on request arguments: {}", ex.getMessage());
        Map<String, String> response = new HashMap<>();
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getDefaultMessage())
                .reduce((msg1, msg2) -> msg1 + ". " + msg2)
                .orElse("Dữ liệu nhập vào không hợp lệ.");
        response.put("message", errorMessage);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneralException(Exception ex) {
        log.error("Unhandled internal server error: ", ex);
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getMessage() != null ? ex.getMessage() : "Đã xảy ra lỗi không xác định trên hệ thống.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}


