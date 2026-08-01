package com.studytracker.controller;

import com.studytracker.dto.ConversationSummaryDto;
import com.studytracker.dto.MessageDto;
import com.studytracker.dto.SendMessageRequest;
import com.studytracker.model.User;
import com.studytracker.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping
    public ResponseEntity<MessageDto> sendMessage(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody SendMessageRequest request
    ) {
        MessageDto result = messageService.sendMessage(currentUser, request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationSummaryDto>> getConversations(
            @AuthenticationPrincipal User currentUser
    ) {
        List<ConversationSummaryDto> conversations = messageService.getConversationsList(currentUser);
        return ResponseEntity.ok(conversations);
    }

    @GetMapping("/conversations/{partnerId}")
    public ResponseEntity<Page<MessageDto>> getConversationMessages(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID partnerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<MessageDto> messages = messageService.getConversationMessages(currentUser, partnerId, pageable);
        return ResponseEntity.ok(messages);
    }

    @PutMapping("/conversations/{partnerId}/read")
    public ResponseEntity<Map<String, String>> markAsRead(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID partnerId
    ) {
        messageService.markAsRead(currentUser, partnerId);
        return ResponseEntity.ok(Map.of("message", "Đã đánh dấu tin nhắn là đã đọc."));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal User currentUser
    ) {
        long count = messageService.getUnreadCount(currentUser);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @GetMapping("/check-permission/{partnerId}")
    public ResponseEntity<Map<String, Object>> checkCanSendMessage(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID partnerId
    ) {
        MessageService.CanSendResult check = messageService.checkCanSendMessage(currentUser, partnerId);
        return ResponseEntity.ok(Map.of(
                "canSend", check.isCanSend(),
                "reason", check.getReason() != null ? check.getReason() : ""
        ));
    }
}
