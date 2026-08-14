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
public class CountdownDto {
    private UUID id;
    private String presetExamCode;
    private String title;
    private Instant targetDate;
    private String category;
    private String color;
    private String icon;
    private String note;
    private Boolean isPinned;
    private Boolean emailNotify;
    private Boolean isOfficialDate;
    private String sourceUrl;
    private Integer trackerCount;
    private Instant createdAt;
}

