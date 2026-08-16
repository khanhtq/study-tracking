package com.studytracker.controller;

import com.studytracker.dto.*;
import com.studytracker.model.User;
import com.studytracker.repository.UserRepository;
import com.studytracker.service.ChatRealtimeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Slf4j
@Controller
@RequiredArgsConstructor
public class GroupChatStompController {

    private final ChatRealtimeService chatRealtimeService;
    private final UserRepository userRepository;

    @MessageMapping("/group/{groupId}/send")
    public void handleSendMessage(
            @DestinationVariable("groupId") UUID groupId,
            @Payload SendMessagePayload payload,
            Principal principal) {
        User user = getUserFromPrincipal(principal);
        if (user == null) return;
        try {
            chatRealtimeService.sendMessage(groupId, user, payload);
        } catch (Exception e) {
            log.warn("Lỗi khi gửi tin nhắn STOMP vào nhóm {}: {}", groupId, e.getMessage());
        }
    }

    @MessageMapping("/group/{groupId}/edit")
    public void handleEditMessage(
            @DestinationVariable("groupId") UUID groupId,
            @Payload EditMessagePayload payload,
            Principal principal) {
        User user = getUserFromPrincipal(principal);
        if (user == null) return;
        try {
            chatRealtimeService.editMessage(groupId, user, payload.getMessageId(), payload.getNewContent());
        } catch (Exception e) {
            log.warn("Lỗi khi sửa tin nhắn STOMP: {}", e.getMessage());
        }
    }

    @MessageMapping("/group/{groupId}/delete")
    public void handleDeleteMessage(
            @DestinationVariable("groupId") UUID groupId,
            @Payload UUID messageId,
            Principal principal) {
        User user = getUserFromPrincipal(principal);
        if (user == null) return;
        try {
            chatRealtimeService.deleteMessage(groupId, user, messageId);
        } catch (Exception e) {
            log.warn("Lỗi khi xóa tin nhắn STOMP: {}", e.getMessage());
        }
    }

    @MessageMapping("/group/{groupId}/react")
    public void handleReaction(
            @DestinationVariable("groupId") UUID groupId,
            @Payload ReactMessagePayload payload,
            Principal principal) {
        User user = getUserFromPrincipal(principal);
        if (user == null) return;
        try {
            chatRealtimeService.toggleReaction(groupId, user, payload.getMessageId(), payload.getEmoji());
        } catch (Exception e) {
            log.warn("Lỗi khi thả reaction STOMP: {}", e.getMessage());
        }
    }

    @MessageMapping("/group/{groupId}/pin")
    public void handlePin(
            @DestinationVariable("groupId") UUID groupId,
            @Payload UUID messageId,
            Principal principal) {
        User user = getUserFromPrincipal(principal);
        if (user == null) return;
        try {
            chatRealtimeService.togglePinMessage(groupId, user, messageId);
        } catch (Exception e) {
            log.warn("Lỗi khi ghim tin nhắn STOMP: {}", e.getMessage());
        }
    }

    @MessageMapping("/group/{groupId}/typing")
    public void handleTyping(
            @DestinationVariable("groupId") UUID groupId,
            @Payload TypingPayload payload,
            Principal principal) {
        User user = getUserFromPrincipal(principal);
        if (user == null) return;
        try {
            chatRealtimeService.handleTyping(groupId, user, Boolean.TRUE.equals(payload.getIsTyping()));
        } catch (Exception e) {
            log.warn("Lỗi khi gửi typing indicator STOMP: {}", e.getMessage());
        }
    }

    private User getUserFromPrincipal(Principal principal) {
        if (principal == null || principal.getName() == null) {
            return null;
        }
        return userRepository.findByEmail(principal.getName()).orElse(null);
    }
}
