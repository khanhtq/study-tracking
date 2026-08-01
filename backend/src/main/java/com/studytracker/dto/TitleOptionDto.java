package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TitleOptionDto {
    private String title;
    private String description;
    private Integer minLevelRequired;
    private boolean unlocked;
}
