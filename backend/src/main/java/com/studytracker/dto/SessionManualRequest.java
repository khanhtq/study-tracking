package com.studytracker.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;

@Data
public class SessionManualRequest {
    private String subject;

    @NotNull
    @Min(value = 1, message = "Duration must be at least 1 second")
    private Integer durationSeconds;

    @NotNull
    private Instant startedAt;
}
