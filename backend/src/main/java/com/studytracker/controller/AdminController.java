package com.studytracker.controller;

import com.studytracker.dto.*;
import com.studytracker.model.StudySession;
import com.studytracker.model.User;
import com.studytracker.service.AdminService;
import com.studytracker.service.CountdownService;
import com.studytracker.service.GroupService;
import com.studytracker.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Admin", description = "APIs Quản trị hệ thống, nhóm học, sự kiện & cảnh báo gian lận")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final PaymentService paymentService;
    private final GroupService groupService;
    private final CountdownService countdownService;

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

    // ==================== ADMIN GROUP MANAGEMENT ====================

    @GetMapping("/groups")
    public ResponseEntity<List<GroupSummaryDto>> getAllGroups(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isArchived) {
        return ResponseEntity.ok(groupService.getAllGroupsForAdmin(search, isArchived));
    }

    @PutMapping("/groups/{groupId}")
    public ResponseEntity<GroupSummaryDto> adminUpdateGroup(
            @PathVariable UUID groupId,
            @Valid @RequestBody UpdateGroupRequest request) {
        return ResponseEntity.ok(groupService.adminUpdateGroup(groupId, request));
    }

    @PutMapping("/groups/{groupId}/archive")
    public ResponseEntity<GroupSummaryDto> adminArchiveGroup(
            @PathVariable UUID groupId,
            @RequestParam(defaultValue = "true") boolean isArchived) {
        return ResponseEntity.ok(groupService.adminArchiveGroup(groupId, isArchived));
    }

    @DeleteMapping("/groups/{groupId}")
    public ResponseEntity<Void> adminDeleteGroup(@PathVariable UUID groupId) {
        groupService.adminDeleteGroup(groupId);
        return ResponseEntity.ok().build();
    }

    // ==================== ADMIN COUNTDOWN & PRESET MANAGEMENT ====================

    @GetMapping("/countdowns/presets")
    public ResponseEntity<List<SystemPresetExamDto>> getAllPresetCountdowns() {
        return ResponseEntity.ok(countdownService.getAllPresetsForAdmin());
    }

    @PostMapping("/countdowns/presets")
    public ResponseEntity<SystemPresetExamDto> adminCreatePreset(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody AdminSavePresetRequest request) {
        return ResponseEntity.ok(countdownService.adminCreatePreset(request, currentUser));
    }

    @PutMapping("/countdowns/presets/{examCode}")
    public ResponseEntity<SystemPresetExamDto> adminUpdatePreset(
            @PathVariable String examCode,
            @Valid @RequestBody AdminSavePresetRequest request) {
        return ResponseEntity.ok(countdownService.adminUpdatePreset(examCode, request));
    }

    @DeleteMapping("/countdowns/presets/{examCode}")
    public ResponseEntity<Void> adminDeletePreset(@PathVariable String examCode) {
        countdownService.adminForceDeletePreset(examCode);
        return ResponseEntity.ok().build();
    }

    // ==================== PACKAGE MANAGEMENT APIS ====================
    @GetMapping("/packages")
    public ResponseEntity<List<PaymentPackageDto>> getAllPackages() {
        return ResponseEntity.ok(paymentService.getAllPackages());
    }

    @PostMapping("/packages")
    public ResponseEntity<PaymentPackageDto> createPackage(@RequestBody SavePackageRequest request) {
        return ResponseEntity.ok(paymentService.savePackage(request));
    }

    @PutMapping("/packages/{id}")
    public ResponseEntity<PaymentPackageDto> updatePackage(
            @PathVariable String id,
            @RequestBody SavePackageRequest request) {
        request.setId(id);
        return ResponseEntity.ok(paymentService.savePackage(request));
    }

    @DeleteMapping("/packages/{id}")
    public ResponseEntity<Void> deletePackage(@PathVariable String id) {
        paymentService.deletePackage(id);
        return ResponseEntity.ok().build();
    }
}
