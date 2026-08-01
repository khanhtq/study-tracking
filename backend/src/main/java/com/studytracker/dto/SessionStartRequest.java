package com.studytracker.dto;

import lombok.Data;

@Data
public class SessionStartRequest {
    private String subject;
    private String studyMethod;
    private Integer targetDurationSeconds;
}
