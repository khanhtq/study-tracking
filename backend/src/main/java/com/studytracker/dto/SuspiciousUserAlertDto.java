package com.studytracker.dto;

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
public class SuspiciousUserAlertDto {
    private UUID userId;
    private String displayName;
    private String email;
    private Integer currentLevel;
    private Long totalXp;
    private String severity; // HIGH, MEDIUM, WARNING
    private List<String> reasons;
    private Long totalStudySeconds24h;
    private Long manualSessionsCount24h;
    private Long xpEarned24h;
    private Instant lastActiveAt;
    @com.fasterxml.jackson.annotation.JsonProperty("isBanned")
    private boolean isBanned;
    private String banReason;

    @com.fasterxml.jackson.annotation.JsonProperty("banned")
    public boolean getBanned() {
        return isBanned;
    }
}
