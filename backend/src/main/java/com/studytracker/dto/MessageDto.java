package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageDto {
    private UUID id;
    private UUID senderId;
    private String senderName;
    private String senderAvatar;
    private UUID recipientId;
    private String recipientName;
    private String recipientAvatar;
    private String content;
    private Boolean isRead;
    private Instant readAt;
    private Instant createdAt;
    private Boolean isMine;
}
