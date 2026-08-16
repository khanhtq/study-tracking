package com.studytracker.dto;

import com.studytracker.model.JoinRequestStatus;
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
public class GroupJoinRequestDto {
    private UUID id;
    private UUID groupId;
    private String groupName;
    private UserSummaryDto user;
    private JoinRequestStatus status;
    private String requestMessage;
    private Boolean viaInviteLink;
    private UserSummaryDto reviewedBy;
    private Instant reviewedAt;
    private Instant createdAt;
}
