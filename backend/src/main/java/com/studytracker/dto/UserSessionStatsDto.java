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
public class UserSessionStatsDto {
    private UUID userId;
    private String displayName;
    private String email;
    private String role;
    private Integer currentLevel;
    private Long totalXp;
    private boolean isOnline;
    private boolean isStudying;
    private Instant lastActiveAt;
    private long totalSessionsCount;
    private long totalStudySeconds;
    private long periodStudySeconds;
    private long periodSessionsCount;
    private long periodXpEarned;
    private boolean isSuspicious;
    private java.util.List<String> suspiciousReasons;
    @com.fasterxml.jackson.annotation.JsonProperty("isBanned")
    private boolean isBanned;
    private String banReason;
    private Instant bannedAt;

    @com.fasterxml.jackson.annotation.JsonProperty("banned")
    public boolean getBanned() {
        return isBanned;
    }
}
