package com.studytracker.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final DataSource dataSource;

    @GetMapping
    public ResponseEntity<Map<String, Object>> checkHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", System.currentTimeMillis());

        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(2)) {
                response.put("database", "UP");
                return ResponseEntity.ok(response);
            } else {
                response.put("database", "DOWN");
                response.put("status", "DOWN");
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
            }
        } catch (Exception e) {
            response.put("database", "DOWN");
            response.put("status", "DOWN");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
        }
    }
}
