package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TypingNotificationDto {
    private UUID userId;
    private String displayName;
    private String avatarUrl;
    private Boolean isTyping;
}
