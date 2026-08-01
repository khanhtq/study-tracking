package com.studytracker.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GoogleAuthRequest {
    @NotBlank(message = "Google ID Token không được để trống")
    private String idToken;
}
