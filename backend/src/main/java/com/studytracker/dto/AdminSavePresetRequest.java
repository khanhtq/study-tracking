package com.studytracker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSavePresetRequest {
    private String examCode;

    @NotBlank(message = "Title is required")
    private String title;

    @NotNull(message = "Target date is required")
    private Instant targetDate;

    private String category;
    private Boolean isOfficialDate;
    private String sourceUrl;
    private String description;
    private String color;
    private Boolean isCommunityEvent;
}
