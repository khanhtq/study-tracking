package com.studytracker.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateJoinRequestDto {

    @Size(max = 255, message = "Lời nhắn tham gia tối đa 255 ký tự")
    private String requestMessage;
}
