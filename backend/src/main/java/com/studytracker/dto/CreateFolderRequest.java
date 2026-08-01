package com.studytracker.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateFolderRequest {
    @NotBlank(message = "Tên thư mục không được để trống")
    private String name;
    private Long parentId;
}
