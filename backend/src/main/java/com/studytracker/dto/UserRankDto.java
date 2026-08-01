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
public class UserRankDto {
    private UUID userId;
    private String displayName;
    private String avatarUrl;
    private long rank;
    private Long totalXp;
    private Integer currentLevel;
    private long totalUsers;
}
