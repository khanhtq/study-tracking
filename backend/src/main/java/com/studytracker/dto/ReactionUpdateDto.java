package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactionUpdateDto {
    private UUID messageId;
    private UUID groupId;
    private String emoji;
    private UUID userId;
    private String action; // "ADD" or "REMOVE"
    private List<ReactionGroupDto> reactions;
}
