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
public class AvailableCountdownDto {
    private Long presetExamId;
    private String presetExamCode;
    private UUID customCountdownId;
    private String title;
    private String category;
    private String color;
    private String icon;
    private Instant targetDate;
    private long daysRemaining;
    private boolean isPreset;
    private boolean isOfficialDate;
    private boolean isAlreadyLinked;
}
