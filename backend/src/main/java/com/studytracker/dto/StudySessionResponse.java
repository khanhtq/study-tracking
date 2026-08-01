package com.studytracker.dto;

import com.studytracker.model.SessionSource;
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
public class StudySessionResponse {
    private UUID id;
    private String subject;
    private Instant startedAt;
    private Instant endedAt;
    private Integer durationSeconds;
    private Integer xpEarned;
    private SessionSource source;
    private String studyMethod;
    private Integer targetDurationSeconds;
    private Boolean isCompleted;
    private Instant lastHeartbeatAt;
    private Instant createdAt;
}
