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
public class UserSearchResponseDto {
    private UUID userId;
    private String displayName;
    private String avatarUrl;
    private String selectedTitle;
    private Integer currentLevel;
    private Long totalXp;
    private Boolean isOnline;
    private Boolean isStudying;
    private Instant lastActiveAt;
    private String friendshipStatus; // NONE, PENDING_SENT, PENDING_RECEIVED, FRIENDS, BLOCKED, SELF
    private UUID friendshipId;
}
