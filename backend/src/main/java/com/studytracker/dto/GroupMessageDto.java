package com.studytracker.dto;

import com.studytracker.model.GroupMessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupMessageDto {
    private UUID id;
    private UUID groupId;
    private UserSummaryDto sender;
    private ReplyMessageSummaryDto replyTo;
    private GroupMessageType messageType;
    private String content;
    private Boolean hasMentions;
    private Boolean isEdited;
    private Instant editedAt;
    private Boolean isDeleted;
    private Instant deletedAt;
    private Boolean isPinned;
    private List<MessageAttachmentDto> attachments;
    private List<ReactionGroupDto> reactions;
    private Instant createdAt;
}
