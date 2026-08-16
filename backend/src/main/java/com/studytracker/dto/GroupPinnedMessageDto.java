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
public class GroupPinnedMessageDto {
    private UUID id;
    private UUID messageId;
    private String messageContent;
    private String messageType;
    private UserSummaryDto sender;
    private UserSummaryDto pinnedBy;
    private Instant messageCreatedAt;
    private Instant pinnedAt;
}
