package com.studytracker.dto;

import com.studytracker.model.GroupMessageType;
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
public class SendMessagePayload {
    private String content;
    private GroupMessageType messageType;
    private UUID replyToId;
    private List<AttachmentInputDto> attachments;
}
