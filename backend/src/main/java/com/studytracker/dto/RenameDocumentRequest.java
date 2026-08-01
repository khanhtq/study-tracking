package com.studytracker.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RenameDocumentRequest {
    @NotBlank(message = "Tên mới không được để trống")
    private String name;
}
