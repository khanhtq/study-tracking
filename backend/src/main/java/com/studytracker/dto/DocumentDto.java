package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDto {
    private Long id;
    private String name;
    private String originalFilename;
    private String storagePath;
    private String storageProvider;
    private String contentType;
    private Long sizeBytes;
    private Boolean isFolder;
    private Long parentId;
    private String parentName;
    private Boolean isFavorite;
    private Boolean isDeleted;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
