package com.studytracker.controller;

import com.studytracker.dto.AvailableCountdownDto;
import com.studytracker.dto.GroupCountdownDto;
import com.studytracker.dto.LinkCountdownRequest;
import com.studytracker.model.User;
import com.studytracker.service.GroupCountdownService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Group Countdowns", description = "APIs Liên kết và Quản lý Mục tiêu Đếm ngược của Nhóm Chat")
@RestController
@RequestMapping("/api/v1/chat/groups/{groupId}/countdowns")
@RequiredArgsConstructor
public class GroupCountdownController {

    private final GroupCountdownService groupCountdownService;

    @Operation(summary = "Lấy danh sách sự kiện đếm ngược đã liên kết của nhóm")
    @GetMapping
    public ResponseEntity<List<GroupCountdownDto>> getGroupCountdowns(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(groupCountdownService.getGroupCountdowns(groupId, currentUser));
    }

    @Operation(summary = "Lấy danh sách các sự kiện có thể liên kết (Kỳ thi hệ thống & Sự kiện của Trưởng nhóm)")
    @GetMapping("/available")
    public ResponseEntity<List<AvailableCountdownDto>> getAvailableCountdowns(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(groupCountdownService.getAvailableCountdowns(groupId, currentUser));
    }

    @Operation(summary = "Liên kết sự kiện đếm ngược vào nhóm (Trưởng nhóm / Admin)")
    @PostMapping("/link")
    public ResponseEntity<GroupCountdownDto> linkCountdown(
            @PathVariable("groupId") UUID groupId,
            @Valid @RequestBody LinkCountdownRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupCountdownService.linkCountdown(groupId, request, currentUser));
    }

    @Operation(summary = "Hủy liên kết sự kiện đếm ngược khỏi nhóm (Trưởng nhóm / Admin)")
    @DeleteMapping("/{linkId}")
    public ResponseEntity<Void> unlinkCountdown(
            @PathVariable("groupId") UUID groupId,
            @PathVariable("linkId") UUID linkId,
            @AuthenticationPrincipal User currentUser) {
        groupCountdownService.unlinkCountdown(groupId, linkId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
