package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavePackageRequest {
    private String id;
    private String name;
    private Long priceVnd;
    private Integer durationDays;
    private String tagName;
    private Boolean isActive;
}
