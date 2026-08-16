package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvitePreviewDto {
    private String code;
    private GroupSummaryDto group;
    private Boolean isValid;
    private Boolean isExpired;
    private Boolean isMaxUsesReached;
    private Boolean isAlreadyMember;
    private Boolean hasPendingRequest;
}
