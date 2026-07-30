package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProgressResponse {
    private UUID userId;
    private String email;
    private String displayName;
    private String avatarUrl;
    private String bio;
    private Integer dailyGoalMinutes;
    private String favoriteSubjects;
    private String selectedTitle;
    private String themeAccent;
    private Boolean soundEnabled;
    private String preferredLanguage;
    private String activityStatusVisibility;
    private String messagePermission;
    private String authProvider;
    private String role;
    private Boolean isPremium;
    private Integer currentLevel;
    private Integer currentXp;
    private Integer xpRequiredForNextLevel;
    private Long totalXp;
    private Long pendingFriendRequestsCount;
    private Long unreadMessagesCount;
}
