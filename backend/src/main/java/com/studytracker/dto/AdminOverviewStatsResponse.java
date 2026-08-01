package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminOverviewStatsResponse {
    private long totalUsers;
    private long onlineUsersCount;
    private long studyingUsersCount;
    private long totalSessions;
    private long totalStudySeconds;
    private long totalXpDistributed;
}
