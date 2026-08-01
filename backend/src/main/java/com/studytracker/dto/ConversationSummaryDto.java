package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationSummaryDto {
    private UUID partnerId;
    private String partnerDisplayName;
    private String partnerAvatarUrl;
    private String partnerSelectedTitle;
    private Integer partnerLevel;
    private Boolean isPartnerOnline;
    private Boolean isPartnerStudying;
    private String lastMessageContent;
    private Instant lastMessageCreatedAt;
    private UUID lastMessageSenderId;
    private Long unreadCount;
    private String partnerMessagePermission;
    private Boolean canSendMessage;
    private String restrictionReason;
}
