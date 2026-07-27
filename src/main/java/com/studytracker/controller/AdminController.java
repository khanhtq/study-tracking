package com.studytracker.controller;

import com.studytracker.dto.AdminOverviewStatsResponse;
import com.studytracker.dto.OnlineUserResponse;
import com.studytracker.dto.SuspiciousUserAlertDto;
import com.studytracker.dto.UserSessionStatsDto;
import com.studytracker.model.StudySession;
import com.studytracker.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Admin", description = "APIs Quản trị hệ thống & cảnh báo gian lận")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats/overview")
    public ResponseEntity<AdminOverviewStatsResponse> getOverviewStats() {
        return ResponseEntity.ok(adminService.getOverviewStats());
    }

    @GetMapping("/users/online")
    public ResponseEntity<List<OnlineUserResponse>> getOnlineUsersDetailed() {
        return ResponseEntity.ok(adminService.getOnlineUsersDetailed());
    }

    @GetMapping("/users/stats")
    public ResponseEntity<List<UserSessionStatsDto>> getUserStatsList(
            @RequestParam(defaultValue = "all") String range) {
        return ResponseEntity.ok(adminService.getUserStatsList(range));
    }

    @GetMapping("/users/suspicious")
    public ResponseEntity<List<SuspiciousUserAlertDto>> getSuspiciousUsers() {
        return ResponseEntity.ok(adminService.getSuspiciousUsers());
    }

    @GetMapping("/users/{userId}/sessions")
    public ResponseEntity<List<StudySession>> getUserSessions(@PathVariable UUID userId) {
        return ResponseEntity.ok(adminService.getUserSessions(userId));
    }

    @PutMapping("/users/{userId}/ban")
    public ResponseEntity<Void> banUser(
            @PathVariable UUID userId,
            @RequestBody(required = false) com.studytracker.dto.BanUserRequest request) {
        String reason = request != null ? request.getReason() : null;
        adminService.banUser(userId, reason);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/users/{userId}/unban")
    public ResponseEntity<Void> unbanUser(@PathVariable UUID userId) {
        adminService.unbanUser(userId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/users/{userId}/reset-progress")
    public ResponseEntity<Void> resetUserProgress(@PathVariable UUID userId) {
        adminService.resetUserProgress(userId);
        return ResponseEntity.ok().build();
    }
}
