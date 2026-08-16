package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupDetailDto {
    private GroupSummaryDto group;
    private List<GroupMemberDto> topMembers;
    private List<GroupPinnedMessageDto> pinnedMessages;
    private Long pendingRequestCount;
}
