package com.studytracker.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteFriendsRequest {

    @NotEmpty(message = "Danh sách bạn bè mời không được để trống")
    private List<UUID> friendIds;
}
