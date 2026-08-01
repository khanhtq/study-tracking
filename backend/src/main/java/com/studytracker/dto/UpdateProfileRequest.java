package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {
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
}
