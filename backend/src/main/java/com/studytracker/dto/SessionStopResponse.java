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
public class SessionStopResponse {
    private UUID sessionId;
    private String subject;
    private Integer durationSeconds;
    private Integer xpEarned;
    private String studyMethod;
    private Integer targetDurationSeconds;
    private Boolean isCompleted;
    private Boolean leveledUp;
    private Integer levelBefore;
    private Integer levelAfter;
    private Integer xpBefore;
    private Integer xpAfter;
    private Integer xpRequiredForNextLevel;
}
