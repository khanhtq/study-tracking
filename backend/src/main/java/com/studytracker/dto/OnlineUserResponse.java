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
public class OnlineUserResponse {
    private UUID userId;
    private String displayName;
    private String avatarUrl;
    private String selectedTitle;
    private Instant lastActiveAt;
    private Boolean isStudying;
    private String currentSubject;
    private Instant studyStartedAt;
    private Integer baseLevel;
    private Integer currentLevel;
    private Integer currentXp;
}
