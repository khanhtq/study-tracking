package com.studytracker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactMessagePayload {

    @NotNull(message = "ID tin nhắn không được để trống")
    private UUID messageId;

    @NotBlank(message = "Emoji không được để trống")
    private String emoji;
}
