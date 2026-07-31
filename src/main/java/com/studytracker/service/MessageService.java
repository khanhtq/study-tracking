package com.studytracker.service;

import com.studytracker.dto.ConversationSummaryDto;
import com.studytracker.dto.MessageDto;
import com.studytracker.dto.SendMessageRequest;
import com.studytracker.model.*;
import com.studytracker.repository.FriendshipRepository;
import com.studytracker.repository.MessageRepository;
import com.studytracker.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final FriendshipService friendshipService;
    private final SimpMessagingTemplate messagingTemplate;
    private final VirtualUserService virtualUserService;

    @Data
    @AllArgsConstructor
    public static class CanSendResult {
        private boolean canSend;
        private String reason;
    }

    public CanSendResult canSendMessage(User sender, User recipient) {
        if (sender == null || recipient == null) {
            return new CanSendResult(false, "Thông tin người dùng không hợp lệ.");
        }
        if (sender.getId().equals(recipient.getId())) {
            return new CanSendResult(false, "Không thể gửi tin nhắn cho chính mình.");
        }

        // Virtual users can always receive messages
        if (Boolean.TRUE.equals(recipient.getIsVirtual())) {
            return new CanSendResult(true, null);
        }

        // Admin role can message ANY user in the system without restrictions
        if (sender.getRole() == Role.ROLE_ADMIN) {
            return new CanSendResult(true, null);
        }

        MessagePermission permission = recipient.getMessagePermission();
        if (permission == null) {
            permission = MessagePermission.EVERYONE;
        }

        switch (permission) {
            case EVERYONE:
                return new CanSendResult(true, null);
            case NOBODY:
                return new CanSendResult(false, "Người dùng này đã tắt nhận tin nhắn từ người khác.");
            case FRIENDS_ONLY:
                boolean isFriend = friendshipRepository.isFriends(sender.getId(), recipient.getId());
                if (isFriend) {
                    return new CanSendResult(true, null);
                } else {
                    return new CanSendResult(false, "Người dùng này chỉ nhận tin nhắn từ bạn bè.");
                }
            default:
                return new CanSendResult(true, null);
        }
    }

    @Transactional
    public MessageDto sendMessage(User sender, SendMessageRequest request) {
        User recipient = userRepository.findById(request.getRecipientId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người nhận tin nhắn."));

        CanSendResult check = canSendMessage(sender, recipient);
        if (!check.isCanSend()) {
            throw new IllegalArgumentException(check.getReason());
        }

        Message message = Message.builder()
                .sender(sender)
                .recipient(recipient)
                .content(request.getContent().trim())
                .isRead(false)
                .build();

        Message saved = messageRepository.save(message);

        MessageDto dto = mapToDto(saved, sender.getId());

        // Push real-time event via STOMP if possible
        try {
            MessageDto recipientDto = mapToDto(saved, recipient.getId());
            messagingTemplate.convertAndSendToUser(
                    recipient.getId().toString(),
                    "/queue/messages",
                    recipientDto
            );
        } catch (Exception e) {
            log.warn("Không thể gửi sự kiện Real-time qua WebSocket: {}", e.getMessage());
        }

        // If recipient is a virtual bot, schedule auto-reply
        if (Boolean.TRUE.equals(recipient.getIsVirtual())) {
            virtualUserService.scheduleAutoReply(sender, recipient, request.getContent());
        }

        return dto;
    }

    @Transactional(readOnly = true)
    public Page<MessageDto> getConversationMessages(User currentUser, UUID partnerId, Pageable pageable) {
        userRepository.findById(partnerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đối phương trong cuộc trò chuyện."));

        Page<Message> messages = messageRepository.findConversationBetweenUsers(currentUser.getId(), partnerId, pageable);

        return messages.map(m -> mapToDto(m, currentUser.getId()));
    }

    @Transactional(readOnly = true)
    public List<ConversationSummaryDto> getConversationsList(User currentUser) {
        List<UUID> partnerIds = messageRepository.findConversationPartnerIds(currentUser.getId());
        List<ConversationSummaryDto> result = new ArrayList<>();
        Instant onlineThreshold = Instant.now().minus(Duration.ofMinutes(2));

        for (UUID partnerId : partnerIds) {
            Optional<User> partnerOpt = userRepository.findById(partnerId);
            if (partnerOpt.isEmpty()) continue;

            User partner = partnerOpt.get();
            Optional<Message> latestMsgOpt = messageRepository.findLatestMessageBetween(currentUser.getId(), partnerId);
            if (latestMsgOpt.isEmpty()) continue;

            Message latestMsg = latestMsgOpt.get();
            long unreadCount = messageRepository.countByRecipientIdAndSenderIdAndIsReadFalse(currentUser.getId(), partnerId);
            CanSendResult canSendCheck = canSendMessage(currentUser, partner);

            boolean canSeeStatus = friendshipService.shouldShowActivityStatus(partner, currentUser);
            boolean isOnline = canSeeStatus && partner.getLastActiveAt() != null && partner.getLastActiveAt().isAfter(onlineThreshold);

            result.add(ConversationSummaryDto.builder()
                    .partnerId(partner.getId())
                    .partnerDisplayName(partner.getDisplayName() != null ? partner.getDisplayName() : partner.getEmail())
                    .partnerAvatarUrl(partner.getAvatarUrl())
                    .partnerSelectedTitle(partner.getSelectedTitle() != null ? partner.getSelectedTitle() : "Tân Binh Tập Trung")
                    .partnerLevel(partner.getCurrentLevel() != null ? partner.getCurrentLevel() : 1)
                    .isPartnerOnline(isOnline)
                    .lastMessageContent(latestMsg.getContent())
                    .lastMessageCreatedAt(latestMsg.getCreatedAt())
                    .lastMessageSenderId(latestMsg.getSender().getId())
                    .unreadCount(unreadCount)
                    .partnerMessagePermission(partner.getMessagePermission() != null ? partner.getMessagePermission().name() : "EVERYONE")
                    .canSendMessage(canSendCheck.isCanSend())
                    .restrictionReason(canSendCheck.getReason())
                    .build());
        }

        result.sort(Comparator.comparing(ConversationSummaryDto::getLastMessageCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return result;
    }

    @Transactional
    public void markAsRead(User currentUser, UUID partnerId) {
        messageRepository.markConversationAsRead(currentUser.getId(), partnerId, Instant.now());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(User currentUser) {
        return messageRepository.countByRecipientIdAndIsReadFalse(currentUser.getId());
    }

    @Transactional(readOnly = true)
    public CanSendResult checkCanSendMessage(User currentUser, UUID partnerId) {
        User partner = userRepository.findById(partnerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));
        return canSendMessage(currentUser, partner);
    }

    private MessageDto mapToDto(Message message, UUID currentUserId) {
        User sender = message.getSender();
        User recipient = message.getRecipient();
        boolean isMine = sender.getId().equals(currentUserId);

        return MessageDto.builder()
                .id(message.getId())
                .senderId(sender.getId())
                .senderName(sender.getDisplayName() != null ? sender.getDisplayName() : sender.getEmail())
                .senderAvatar(sender.getAvatarUrl())
                .recipientId(recipient.getId())
                .recipientName(recipient.getDisplayName() != null ? recipient.getDisplayName() : recipient.getEmail())
                .recipientAvatar(recipient.getAvatarUrl())
                .content(message.getContent())
                .isRead(message.getIsRead())
                .readAt(message.getReadAt())
                .createdAt(message.getCreatedAt())
                .isMine(isMine)
                .build();
    }
}
