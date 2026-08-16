package com.studytracker.dto;

import com.studytracker.model.AttachmentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageAttachmentDto {
    private UUID id;
    private Long studyDocumentId;
    private String fileUrl;
    private String thumbnailUrl;
    private String fileName;
    private Long fileSize;
    private String mimeType;
    private AttachmentType attachmentType;
    private String metadata;
}
