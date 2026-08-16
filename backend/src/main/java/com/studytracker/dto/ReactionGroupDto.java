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
public class ReactionGroupDto {
    private String emoji;
    private Integer count;
    private List<UUID> userIds;
    private Boolean hasReacted;
}
