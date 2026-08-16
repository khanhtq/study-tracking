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
public class GroupInviteLinkDto {
    private UUID id;
    private UUID groupId;
    private String code;
    private String inviteUrl;
    private UserSummaryDto createdBy;
    private Integer maxUses;
    private Integer usedCount;
    private Instant expiresAt;
    private Boolean isRevoked;
    private Boolean isValid;
    private Instant createdAt;
}
