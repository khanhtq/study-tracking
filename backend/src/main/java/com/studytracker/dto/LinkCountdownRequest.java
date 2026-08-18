package com.studytracker.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LinkCountdownRequest {
    private Long presetExamId;
    private String presetExamCode;
    private UUID customCountdownId;

    @JsonSetter(nulls = Nulls.SET_TO_NULL)
    public void setCustomCountdownId(String rawId) {
        if (rawId == null || rawId.isBlank() || "null".equalsIgnoreCase(rawId.trim()) || "undefined".equalsIgnoreCase(rawId.trim())) {
            this.customCountdownId = null;
        } else {
            try {
                this.customCountdownId = UUID.fromString(rawId.trim());
            } catch (Exception e) {
                this.customCountdownId = null;
            }
        }
    }
}
