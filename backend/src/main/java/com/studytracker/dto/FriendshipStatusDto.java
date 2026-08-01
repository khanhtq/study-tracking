package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendshipStatusDto {
    private String status; // NONE, PENDING_SENT, PENDING_RECEIVED, FRIENDS, BLOCKED
    private UUID friendshipId;
}
