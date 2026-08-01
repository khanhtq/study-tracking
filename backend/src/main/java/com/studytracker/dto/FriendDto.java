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
public class FriendDto {
    private UUID friendshipId;
    private UUID userId;
    private String displayName;
    private String email;
    private String avatarUrl;
    private String selectedTitle;
    private Boolean isPremium;
    private Integer currentLevel;
    private Long totalXp;
    private String friendshipStatus; // ACCEPTED, PENDING
    private Instant requestCreatedAt;
    
    // Privacy-controlled activity fields
    private Boolean isOnline;
    private Instant lastActiveAt;
    private Boolean isStudying;
    private String currentSubject;
    private Instant studyStartedAt;
}
