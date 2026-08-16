package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessagesCursorPageResponse {
    private List<GroupMessageDto> messages;
    private Boolean hasMore;
    private Instant oldestCursor;
}
