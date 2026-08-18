package com.studytracker.dto;

import com.studytracker.model.GroupJoinPolicy;
import com.studytracker.model.GroupMemberStatus;
import com.studytracker.model.GroupPrivacy;
import com.studytracker.model.GroupRole;
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
public class GroupSummaryDto {
    private UUID id;
    private String name;
    private String slug;
    private String description;
    private String avatarUrl;
    private String coverUrl;
    private GroupPrivacy privacy;
    private GroupJoinPolicy joinPolicy;
    private Integer maxMembers;
    private Integer memberCount;
    private Long messageCount;
    private Double popularityScore;
    private UserSummaryDto owner;
    private GroupRole currentUserRole;
    private GroupMemberStatus currentUserStatus;
    private Instant currentUserMutedUntil;
    private Boolean isMember;
    private Boolean hasPendingRequest;
    private Boolean isArchived;
    private Instant deletedAt;
    private Instant createdAt;
}
