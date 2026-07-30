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
public class PaymentPackageDto {
    private String id;
    private String name;
    private Long priceVnd;
    private Integer durationDays;
    private String tagName;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
}
