package com.studytracker.controller;

import com.studytracker.dto.*;
import com.studytracker.model.User;
import com.studytracker.service.ChatRealtimeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Tag(name = "Group Chat Messages", description = "APIs Quản lý tin nhắn phòng chat, phân trang con trỏ, tìm kiếm & cảm xúc")
@RestController
@RequestMapping("/api/v1/chat/groups/{groupId}/messages")
@RequiredArgsConstructor
public class GroupChatRestController {

    private final ChatRealtimeService chatRealtimeService;

    @Operation(summary = "Lấy lịch sử tin nhắn phòng chat theo phân trang con trỏ (Cursor Pagination)")
    @GetMapping
    public ResponseEntity<MessagesCursorPageResponse> getMessages(
            @PathVariable("groupId") UUID groupId,
            @RequestParam(name = "before", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant before,
            @RequestParam(name = "limit", defaultValue = "30") int limit,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(chatRealtimeService.getMessages(groupId, before, limit, currentUser));
    }

    @Operation(summary = "Gửi tin nhắn mới vào phòng chat (REST fallback)")
    @PostMapping
    public ResponseEntity<GroupMessageDto> sendMessage(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody SendMessagePayload payload) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatRealtimeService.sendMessage(groupId, currentUser, payload));
    }

    @Operation(summary = "Tìm kiếm tin nhắn trong phòng chat")
    @GetMapping("/search")
    public ResponseEntity<List<GroupMessageDto>> searchMessages(
            @PathVariable("groupId") UUID groupId,
            @RequestParam("q") String query,
            @RequestParam(name = "limit", defaultValue = "20") int limit,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(chatRealtimeService.searchMessages(groupId, query, limit, currentUser));
    }

    @Operation(summary = "Lấy danh sách tin nhắn đã ghim trong phòng chat")
    @GetMapping("/pinned")
    public ResponseEntity<List<GroupPinnedMessageDto>> getPinnedMessages(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(chatRealtimeService.getPinnedMessages(groupId, currentUser));
    }

    @Operation(summary = "Chỉnh sửa tin nhắn")
    @PutMapping("/{messageId}")
    public ResponseEntity<GroupMessageDto> editMessage(
            @PathVariable("groupId") UUID groupId,
            @PathVariable("messageId") UUID messageId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody EditMessagePayload payload) {
        return ResponseEntity.ok(chatRealtimeService.editMessage(groupId, currentUser, messageId, payload.getNewContent()));
    }

    @Operation(summary = "Xóa tin nhắn (Soft delete)")
    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable("groupId") UUID groupId,
            @PathVariable("messageId") UUID messageId,
            @AuthenticationPrincipal User currentUser) {
        chatRealtimeService.deleteMessage(groupId, currentUser, messageId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Thả hoặc gỡ cảm xúc (Reaction)")
    @PostMapping("/{messageId}/reactions")
    public ResponseEntity<ReactionUpdateDto> toggleReaction(
            @PathVariable("groupId") UUID groupId,
            @PathVariable("messageId") UUID messageId,
            @RequestParam("emoji") String emoji,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(chatRealtimeService.toggleReaction(groupId, currentUser, messageId, emoji));
    }

    @Operation(summary = "Ghim hoặc bỏ ghim tin nhắn")
    @PostMapping("/{messageId}/pin")
    public ResponseEntity<Boolean> togglePinMessage(
            @PathVariable("groupId") UUID groupId,
            @PathVariable("messageId") UUID messageId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(chatRealtimeService.togglePinMessage(groupId, currentUser, messageId));
    }
}
