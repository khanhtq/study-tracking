package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StorageQuotaDto {
    private Long usedBytes;
    private Long maxBytes;
    private Double usagePercentage;
    private String formattedUsed;
    private String formattedMax;
    private Long maxFileSizeBytes;
    private String formattedMaxFileSize;
}
