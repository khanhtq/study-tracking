package com.studytracker.controller;

import com.studytracker.dto.GroupSummaryDto;
import com.studytracker.dto.InvitePreviewDto;
import com.studytracker.model.User;
import com.studytracker.service.GroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Group Invites", description = "APIs Xem trước và Tham gia nhóm qua Link/Mã mời")
@RestController
@RequestMapping("/api/v1/chat/invites")
@RequiredArgsConstructor
public class GroupInvitePublicController {

    private final GroupService groupService;

    @Operation(summary = "Xem trước thông tin nhóm qua mã mời")
    @GetMapping("/{code}")
    public ResponseEntity<InvitePreviewDto> previewInvite(
            @PathVariable("code") String code,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(groupService.previewInvite(code, currentUser));
    }

    @Operation(summary = "Xác nhận tham gia nhóm qua mã mời")
    @PostMapping("/{code}/join")
    public ResponseEntity<GroupSummaryDto> joinViaInvite(
            @PathVariable("code") String code,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(groupService.joinViaInvite(code, currentUser));
    }
}
