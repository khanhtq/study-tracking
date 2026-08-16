package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInviteLinkRequest {
    private Integer expiresInDays; // null = never, 1, 7, 30
    private Integer maxUses; // null = unlimited, 10, 50, 100
}
