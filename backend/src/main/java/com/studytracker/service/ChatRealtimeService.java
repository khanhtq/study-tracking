package com.studytracker.service;

import com.studytracker.dto.*;
import com.studytracker.model.*;
import com.studytracker.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatRealtimeService {

    private final GroupMessageRepository groupMessageRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final MessageAttachmentRepository messageAttachmentRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final GroupPinnedMessageRepository groupPinnedMessageRepository;
    private final MessageMentionRepository messageMentionRepository;
    private final StudyDocumentRepository studyDocumentRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final GroupService groupService;

    private static final Pattern MENTION_PATTERN = Pattern.compile("@([a-zA-Z0-9_.@-]+)");

    // ==================== 1. GỬI TIN NHẮN REALTIME ====================

    @Transactional
    public GroupMessageDto sendMessage(UUID groupId, User currentUser, SendMessagePayload payload) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Nhóm không tồn tại"));

        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId())
                .orElseThrow(() -> new SecurityException("Bạn không phải là thành viên của nhóm này"));

        if (member.getStatus() == GroupMemberStatus.BANNED) {
            throw new SecurityException("Bạn đã bị cấm khỏi nhóm");
        }

        if (member.getStatus() == GroupMemberStatus.MUTED) {
            if (member.getMutedUntil() != null && member.getMutedUntil().isAfter(Instant.now())) {
                throw new SecurityException("Bạn đang bị tắt quyền chat trong nhóm này");
            } else {
                member.setStatus(GroupMemberStatus.ACTIVE);
                member.setMutedUntil(null);
                groupMemberRepository.save(member);
            }
        }

        GroupMessage replyTo = null;
        if (payload.getReplyToId() != null) {
            replyTo = groupMessageRepository.findActiveByIdWithDetails(payload.getReplyToId()).orElse(null);
        }

        GroupMessageType type = payload.getMessageType() != null ? payload.getMessageType() : GroupMessageType.TEXT;

        GroupMessage message = GroupMessage.builder()
                .group(group)
                .sender(currentUser)
                .replyTo(replyTo)
                .messageType(type)
                .content(payload.getContent())
                .hasMentions(false)
                .isEdited(false)
                .isDeleted(false)
                .isPinned(false)
                .build();

        GroupMessage savedMessage = groupMessageRepository.save(message);

        // Lưu attachments nếu có
        List<MessageAttachment> savedAttachments = new ArrayList<>();
        if (payload.getAttachments() != null && !payload.getAttachments().isEmpty()) {
            for (AttachmentInputDto attInput : payload.getAttachments()) {
                StudyDocument studyDoc = null;
                if (attInput.getStudyDocumentId() != null) {
                    studyDoc = studyDocumentRepository.findById(attInput.getStudyDocumentId()).orElse(null);
                }

                MessageAttachment att = MessageAttachment.builder()
                        .message(savedMessage)
                        .studyDocument(studyDoc)
                        .fileUrl(attInput.getFileUrl())
                        .thumbnailUrl(attInput.getThumbnailUrl())
                        .fileName(attInput.getFileName() != null ? attInput.getFileName() : "file")
                        .fileSize(attInput.getFileSize() != null ? attInput.getFileSize() : 0L)
                        .mimeType(attInput.getMimeType() != null ? attInput.getMimeType() : "application/octet-stream")
                        .attachmentType(attInput.getAttachmentType() != null ? attInput.getAttachmentType() : AttachmentType.DOCUMENT)
                        .metadata(attInput.getMetadata())
                        .build();
                savedAttachments.add(messageAttachmentRepository.save(att));
            }
        }
        savedMessage.setAttachments(savedAttachments);

        // Xử lý @mentions
        if (payload.getContent() != null && payload.getContent().contains("@")) {
            handleMentions(savedMessage, group, payload.getContent());
        }

        // Cập nhật thống kê nhóm
        group.setMessageCount((group.getMessageCount() != null ? group.getMessageCount() : 0) + 1);
        chatGroupRepository.save(group);

        GroupMessageDto responseDto = mapToMessageDto(savedMessage, currentUser);

        // Broadcast tin nhắn realtime qua STOMP Topic
        messagingTemplate.convertAndSend("/topic/group." + groupId + ".messages", responseDto);

        log.info("Tin nhắn mới [{}] đã gửi vào nhóm [{}] bởi [{}]", savedMessage.getId(), group.getName(), currentUser.getEmail());
        return responseDto;
    }

    // ==================== 2. CHỈNH SỬA / XÓA TIN NHẮN ====================

    @Transactional
    public GroupMessageDto editMessage(UUID groupId, User currentUser, UUID messageId, String newContent) {
        GroupMessage message = groupMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tin nhắn"));

        if (!message.getGroup().getId().equals(groupId)) {
            throw new IllegalArgumentException("Tin nhắn không thuộc nhóm này");
        }

        if (!message.getSender().getId().equals(currentUser.getId())) {
            throw new SecurityException("Chỉ người gửi mới có quyền chỉnh sửa tin nhắn");
        }

        if (message.getIsDeleted()) {
            throw new IllegalArgumentException("Tin nhắn đã bị xóa");
        }

        message.setContent(newContent);
        message.setIsEdited(true);
        message.setEditedAt(Instant.now());
        GroupMessage updated = groupMessageRepository.save(message);

        GroupMessageDto dto = mapToMessageDto(updated, currentUser);
        messagingTemplate.convertAndSend("/topic/group." + groupId + ".messages", dto);

        return dto;
    }

    @Transactional
    public void deleteMessage(UUID groupId, User currentUser, UUID messageId) {
        GroupMessage message = groupMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tin nhắn"));

        if (!message.getGroup().getId().equals(groupId)) {
            throw new IllegalArgumentException("Tin nhắn không thuộc nhóm này");
        }

        boolean isAuthor = message.getSender().getId().equals(currentUser.getId());
        if (!isAuthor) {
            GroupMember currentMember = groupService.getActiveMember(groupId, currentUser.getId());
            if (currentMember.getRole() != GroupRole.OWNER && currentMember.getRole() != GroupRole.ADMIN && currentMember.getRole() != GroupRole.MODERATOR) {
                throw new SecurityException("Bạn không có quyền xóa tin nhắn này");
            }
        }

        message.setIsDeleted(true);
        message.setDeletedAt(Instant.now());
        groupMessageRepository.save(message);

        GroupMessageDto dto = mapToMessageDto(message, currentUser);
        messagingTemplate.convertAndSend("/topic/group." + groupId + ".messages", dto);
    }

    // ==================== 3. CẢM XÚC (REACTIONS) REALTIME ====================

    @Transactional
    public ReactionUpdateDto toggleReaction(UUID groupId, User currentUser, UUID messageId, String emoji) {
        groupService.verifyGroupMember(groupId, currentUser.getId());

        GroupMessage message = groupMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tin nhắn"));

        Optional<MessageReaction> existingOpt = messageReactionRepository.findByMessageIdAndUserIdAndEmoji(messageId, currentUser.getId(), emoji);
        String action;

        if (existingOpt.isPresent()) {
            messageReactionRepository.delete(existingOpt.get());
            action = "REMOVE";
        } else {
            MessageReaction reaction = MessageReaction.builder()
                    .message(message)
                    .user(currentUser)
                    .emoji(emoji)
                    .build();
            messageReactionRepository.save(reaction);
            action = "ADD";
        }

        List<MessageReaction> allReactions = messageReactionRepository.findByMessageId(messageId);
        List<ReactionGroupDto> reactionGroups = aggregateReactions(allReactions, currentUser.getId());

        ReactionUpdateDto updateDto = ReactionUpdateDto.builder()
                .messageId(messageId)
                .groupId(groupId)
                .emoji(emoji)
                .userId(currentUser.getId())
                .action(action)
                .reactions(reactionGroups)
                .build();

        messagingTemplate.convertAndSend("/topic/group." + groupId + ".reactions", updateDto);
        return updateDto;
    }

    // ==================== 4. GHIM TIN NHẮN REALTIME ====================

    @Transactional
    public boolean togglePinMessage(UUID groupId, User currentUser, UUID messageId) {
        ChatGroup group = groupService.getGroupEntity(groupId);
        GroupMember currentMember = groupService.getActiveMember(groupId, currentUser.getId());

        if (currentMember.getRole() != GroupRole.OWNER && currentMember.getRole() != GroupRole.ADMIN && currentMember.getRole() != GroupRole.MODERATOR) {
            throw new SecurityException("Chỉ Quản trị viên và Kiểm duyệt viên mới có quyền ghim tin nhắn");
        }

        GroupMessage message = groupMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tin nhắn"));

        Optional<GroupPinnedMessage> pinnedOpt = groupPinnedMessageRepository.findByGroupIdAndMessageId(groupId, messageId);
        boolean isPinnedNow;

        if (pinnedOpt.isPresent()) {
            groupPinnedMessageRepository.delete(pinnedOpt.get());
            message.setIsPinned(false);
            isPinnedNow = false;
        } else {
            GroupPinnedMessage pm = GroupPinnedMessage.builder()
                    .group(group)
                    .message(message)
                    .pinnedBy(currentUser)
                    .build();
            groupPinnedMessageRepository.save(pm);
            message.setIsPinned(true);
            isPinnedNow = true;
        }

        groupMessageRepository.save(message);

        // Broadcast pinned messages update
        List<GroupPinnedMessageDto> updatedPinned = groupPinnedMessageRepository.findByGroupIdWithDetails(groupId).stream()
                .map(groupService::mapToPinnedDto)
                .collect(Collectors.toList());

        messagingTemplate.convertAndSend("/topic/group." + groupId + ".pinned", updatedPinned);
        return isPinnedNow;
    }

    // ==================== 5. TYPING INDICATOR REALTIME ====================

    public void handleTyping(UUID groupId, User currentUser, boolean isTyping) {
        TypingNotificationDto notif = TypingNotificationDto.builder()
                .userId(currentUser.getId())
                .displayName(currentUser.getDisplayName() != null ? currentUser.getDisplayName() : currentUser.getEmail())
                .avatarUrl(currentUser.getAvatarUrl())
                .isTyping(isTyping)
                .build();

        messagingTemplate.convertAndSend("/topic/group." + groupId + ".typing", notif);
    }

    // ==================== 6. TRUY VẤN LỊCH SỬ TIN NHẮN (CURSOR PAGINATION & SEARCH) ====================

    @Transactional(readOnly = true)
    public MessagesCursorPageResponse getMessages(UUID groupId, Instant before, int limit, User currentUser) {
        groupService.verifyGroupMember(groupId, currentUser.getId());

        int pageSize = Math.min(100, Math.max(1, limit));
        Pageable pageable = PageRequest.of(0, pageSize + 1);

        List<GroupMessage> rawMessages;
        if (before == null) {
            rawMessages = groupMessageRepository.findLatestMessages(groupId, pageable);
        } else {
            rawMessages = groupMessageRepository.findOlderMessages(groupId, before, pageable);
        }

        boolean hasMore = rawMessages.size() > pageSize;
        List<GroupMessage> actualList = hasMore ? rawMessages.subList(0, pageSize) : rawMessages;

        Instant oldestCursor = null;
        if (!actualList.isEmpty()) {
            oldestCursor = actualList.get(actualList.size() - 1).getCreatedAt();
        }

        // Đảo chiều để hiển thị theo thứ tự thời gian tăng dần (từ cũ đến mới)
        Collections.reverse(actualList);

        List<GroupMessageDto> dtos = populateMessageDetails(actualList, currentUser.getId());

        return MessagesCursorPageResponse.builder()
                .messages(dtos)
                .hasMore(hasMore)
                .oldestCursor(oldestCursor)
                .build();
    }

    @Transactional(readOnly = true)
    public List<GroupMessageDto> searchMessages(UUID groupId, String query, int limit, User currentUser) {
        groupService.verifyGroupMember(groupId, currentUser.getId());

        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }

        Pageable pageable = PageRequest.of(0, Math.min(50, Math.max(1, limit)));
        List<GroupMessage> results = groupMessageRepository.searchMessages(groupId, query.trim(), pageable);

        return populateMessageDetails(results, currentUser.getId());
    }

    @Transactional(readOnly = true)
    public List<GroupPinnedMessageDto> getPinnedMessages(UUID groupId, User currentUser) {
        groupService.verifyGroupMember(groupId, currentUser.getId());

        return groupPinnedMessageRepository.findByGroupIdWithDetails(groupId).stream()
                .map(groupService::mapToPinnedDto)
                .collect(Collectors.toList());
    }

    // ==================== HELPER METHODS ====================

    private void handleMentions(GroupMessage message, ChatGroup group, String content) {
        Matcher matcher = MENTION_PATTERN.matcher(content);
        Set<String> mentionedHandles = new HashSet<>();
        while (matcher.find()) {
            mentionedHandles.add(matcher.group(1).toLowerCase());
        }

        if (mentionedHandles.isEmpty()) return;

        List<GroupMember> members = groupMemberRepository.findActiveMembersWithUser(group.getId());
        boolean hasAnyMention = false;

        for (GroupMember m : members) {
            String email = m.getUser().getEmail().toLowerCase();
            String displayName = m.getUser().getDisplayName() != null ? m.getUser().getDisplayName().toLowerCase() : "";

            if (mentionedHandles.contains(email) || (!displayName.isEmpty() && mentionedHandles.contains(displayName)) || mentionedHandles.contains("all")) {
                if (!m.getUser().getId().equals(message.getSender().getId())) {
                    MessageMention mention = MessageMention.builder()
                            .message(message)
                            .group(group)
                            .mentionedUser(m.getUser())
                            .isRead(false)
                            .build();
                    messageMentionRepository.save(mention);
                    hasAnyMention = true;
                }
            }
        }

        if (hasAnyMention) {
            message.setHasMentions(true);
            groupMessageRepository.save(message);
        }
    }

    private List<GroupMessageDto> populateMessageDetails(List<GroupMessage> messages, UUID currentUserId) {
        if (messages.isEmpty()) return Collections.emptyList();

        List<UUID> messageIds = messages.stream().map(GroupMessage::getId).collect(Collectors.toList());
        List<MessageAttachment> attachments = messageAttachmentRepository.findByMessageIdIn(messageIds);
        List<MessageReaction> reactions = messageReactionRepository.findByMessageIdInWithUser(messageIds);

        Map<UUID, List<MessageAttachment>> attachmentMap = attachments.stream()
                .collect(Collectors.groupingBy(a -> a.getMessage().getId()));

        Map<UUID, List<MessageReaction>> reactionMap = reactions.stream()
                .collect(Collectors.groupingBy(r -> r.getMessage().getId()));

        List<GroupMessageDto> dtos = new ArrayList<>();
        for (GroupMessage msg : messages) {
            List<MessageAttachment> msgAtts = attachmentMap.getOrDefault(msg.getId(), Collections.emptyList());
            List<MessageReaction> msgReacts = reactionMap.getOrDefault(msg.getId(), Collections.emptyList());

            dtos.add(mapToMessageDtoWithData(msg, msgAtts, msgReacts, currentUserId));
        }

        return dtos;
    }

    public GroupMessageDto mapToMessageDto(GroupMessage msg, User currentUser) {
        List<MessageAttachment> atts = messageAttachmentRepository.findByMessageId(msg.getId());
        List<MessageReaction> reacts = messageReactionRepository.findByMessageId(msg.getId());
        return mapToMessageDtoWithData(msg, atts, reacts, currentUser != null ? currentUser.getId() : null);
    }

    private GroupMessageDto mapToMessageDtoWithData(GroupMessage msg, List<MessageAttachment> attachments, List<MessageReaction> reactions, UUID currentUserId) {
        ReplyMessageSummaryDto replyDto = null;
        if (msg.getReplyTo() != null && !msg.getReplyTo().getIsDeleted()) {
            replyDto = ReplyMessageSummaryDto.builder()
                    .id(msg.getReplyTo().getId())
                    .content(msg.getReplyTo().getContent())
                    .senderDisplayName(msg.getReplyTo().getSender().getDisplayName() != null ? msg.getReplyTo().getSender().getDisplayName() : msg.getReplyTo().getSender().getEmail())
                    .messageType(msg.getReplyTo().getMessageType().name())
                    .build();
        }

        List<MessageAttachmentDto> attDtos = attachments.stream()
                .map(a -> MessageAttachmentDto.builder()
                        .id(a.getId())
                        .studyDocumentId(a.getStudyDocument() != null ? a.getStudyDocument().getId() : null)
                        .fileUrl(a.getFileUrl())
                        .thumbnailUrl(a.getThumbnailUrl())
                        .fileName(a.getFileName())
                        .fileSize(a.getFileSize())
                        .mimeType(a.getMimeType())
                        .attachmentType(a.getAttachmentType())
                        .metadata(a.getMetadata())
                        .build())
                .collect(Collectors.toList());

        List<ReactionGroupDto> reactionGroups = aggregateReactions(reactions, currentUserId);

        return GroupMessageDto.builder()
                .id(msg.getId())
                .groupId(msg.getGroup().getId())
                .sender(groupService.mapToUserSummaryDto(msg.getSender()))
                .replyTo(replyDto)
                .messageType(msg.getMessageType())
                .content(msg.getIsDeleted() ? "Tin nhắn này đã bị xóa" : msg.getContent())
                .hasMentions(msg.getHasMentions())
                .isEdited(msg.getIsEdited())
                .editedAt(msg.getEditedAt())
                .isDeleted(msg.getIsDeleted())
                .deletedAt(msg.getDeletedAt())
                .isPinned(msg.getIsPinned())
                .attachments(attDtos)
                .reactions(reactionGroups)
                .createdAt(msg.getCreatedAt())
                .build();
    }

    private List<ReactionGroupDto> aggregateReactions(List<MessageReaction> reactions, UUID currentUserId) {
        if (reactions.isEmpty()) return Collections.emptyList();

        Map<String, List<MessageReaction>> byEmoji = reactions.stream()
                .collect(Collectors.groupingBy(MessageReaction::getEmoji));

        List<ReactionGroupDto> list = new ArrayList<>();
        for (Map.Entry<String, List<MessageReaction>> entry : byEmoji.entrySet()) {
            List<UUID> userIds = entry.getValue().stream()
                    .map(r -> r.getUser().getId())
                    .collect(Collectors.toList());

            boolean hasReacted = currentUserId != null && userIds.contains(currentUserId);

            list.add(ReactionGroupDto.builder()
                    .emoji(entry.getKey())
                    .count(entry.getValue().size())
                    .userIds(userIds)
                    .hasReacted(hasReacted)
                    .build());
        }

        return list;
    }
}
