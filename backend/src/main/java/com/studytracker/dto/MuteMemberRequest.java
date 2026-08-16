package com.studytracker.dto;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MuteMemberRequest {

    @Min(value = 1, message = "Thời gian tắt chat tối thiểu 1 phút")
    private Integer durationMinutes; // vd: 60 (1h), 1440 (24h), 10080 (7 ngày)
}
