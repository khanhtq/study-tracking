package com.studytracker.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShareStudyDocumentRequest {

    @NotNull(message = "ID tài liệu không được để trống")
    private Long documentId;

    private String caption;
}
