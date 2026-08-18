package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemPresetExamDto {
    private Long id;
    private String examCode;
    private String title;
    private String category;
    private Instant targetDate;
    private Boolean isOfficialDate;
    private String sourceUrl;
    private String description;
    private String color;
    private Integer trackerCount;
    private String createdByUserId;
    private String creatorDisplayName;
    private Boolean isCommunityEvent;
    private Instant lastSyncedAt;
}

