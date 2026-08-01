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
public class PublicUserProfileDto {
    private UUID userId;
    private String displayName;
    private String avatarUrl;
    private String selectedTitle;
    private Boolean isPremium;
    private String studyGoal;
    private Integer currentLevel;
    private Integer currentXp;
    private Integer xpRequiredForNextLevel;
    private Long totalXp;
    private Integer streakDays;
    private Boolean isOnline;
    private Instant lastActiveAt;
    private Boolean isStudying;
    private String currentSubject;
    private Instant studyStartedAt;
    private Long totalStudyTimeMinutes;
    private Long totalSessionsCount;
    private String friendshipStatus; // NONE, PENDING_SENT, PENDING_RECEIVED, FRIENDS, BLOCKED
    private UUID friendshipId;
}
