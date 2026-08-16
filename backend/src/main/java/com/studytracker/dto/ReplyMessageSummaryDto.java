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
public class ReplyMessageSummaryDto {
    private UUID id;
    private String content;
    private String senderDisplayName;
    private String messageType;
}
