package com.studytracker.service;

import com.studytracker.dto.CreateGroupRequest;
import com.studytracker.dto.CreateInviteLinkRequest;
import com.studytracker.dto.GroupInviteLinkDto;
import com.studytracker.dto.GroupSummaryDto;
import com.studytracker.model.*;
import com.studytracker.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class GroupServiceTest {

    @Mock
    private ChatGroupRepository chatGroupRepository;

    @Mock
    private GroupMemberRepository groupMemberRepository;

    @Mock
    private GroupJoinRequestRepository groupJoinRequestRepository;

    @Mock
    private GroupInviteLinkRepository groupInviteLinkRepository;

    @Mock
    private GroupPinnedMessageRepository groupPinnedMessageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GroupRankingService groupRankingService;

    @InjectMocks
    private GroupService groupService;

    private User testUser;
    private User otherUser;
    private ChatGroup publicGroup;
    private UUID groupId;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("khanhtq@study.com")
                .displayName("Tran Quoc Khanh")
                .role(Role.ROLE_USER)
                .currentLevel(1)
                .totalXp(100L)
                .build();

        otherUser = User.builder()
                .id(UUID.randomUUID())
                .email("namnv@study.com")
                .displayName("Nguyen Van Nam")
                .role(Role.ROLE_USER)
                .currentLevel(2)
                .totalXp(250L)
                .build();

        groupId = UUID.randomUUID();
        publicGroup = ChatGroup.builder()
                .id(groupId)
                .name("Nhóm Ôn Thi THPT 2026")
                .slug("nhom-on-thi-thpt-2026")
                .privacy(GroupPrivacy.PUBLIC)
                .joinPolicy(GroupJoinPolicy.OPEN)
                .maxMembers(5000)
                .memberCount(1)
                .popularityScore(1.0)
                .owner(testUser)
                .isArchived(false)
                .build();
    }

    @Test
    @DisplayName("Tạo nhóm mới thành công và gán người tạo làm OWNER")
    void shouldCreateGroupSuccessfully() {
        CreateGroupRequest request = CreateGroupRequest.builder()
                .name("Học Nhóm Java Spring Boot")
                .privacy(GroupPrivacy.PUBLIC)
                .joinPolicy(GroupJoinPolicy.OPEN)
                .maxMembers(100)
                .build();

        when(chatGroupRepository.existsBySlug(any())).thenReturn(false);
        when(chatGroupRepository.save(any(ChatGroup.class))).thenAnswer(invocation -> {
            ChatGroup g = invocation.getArgument(0);
            g.setId(UUID.randomUUID());
            return g;
        });

        GroupSummaryDto result = groupService.createGroup(testUser, request);

        assertNotNull(result);
        assertEquals("Học Nhóm Java Spring Boot", result.getName());
        verify(groupMemberRepository, times(1)).save(any(GroupMember.class));
        verify(groupRankingService, times(1)).updateGroupScore(any(UUID.class), anyDouble());
    }

    @Test
    @DisplayName("Tham gia nhóm OPEN trực tiếp thành công")
    void shouldJoinOpenGroupDirectly() {
        when(chatGroupRepository.findById(groupId)).thenReturn(Optional.of(publicGroup));
        when(groupMemberRepository.findByGroupIdAndUserId(groupId, otherUser.getId())).thenReturn(Optional.empty());

        GroupSummaryDto result = groupService.joinGroup(groupId, otherUser, null);

        assertNotNull(result);
        assertEquals(2, publicGroup.getMemberCount());
        verify(groupMemberRepository, times(1)).save(any(GroupMember.class));
    }

    @Test
    @DisplayName("Tạo link mời nhóm và tham gia qua link mời hợp lệ")
    void shouldCreateAndJoinViaInviteLink() {
        CreateInviteLinkRequest request = CreateInviteLinkRequest.builder()
                .expiresInDays(7)
                .maxUses(50)
                .build();

        when(chatGroupRepository.findById(groupId)).thenReturn(Optional.of(publicGroup));
        when(groupInviteLinkRepository.existsByCode(any())).thenReturn(false);
        when(groupInviteLinkRepository.save(any(GroupInviteLink.class))).thenAnswer(invocation -> {
            GroupInviteLink link = invocation.getArgument(0);
            link.setId(UUID.randomUUID());
            return link;
        });

        GroupInviteLinkDto inviteDto = groupService.createInviteLink(groupId, request, testUser);
        assertNotNull(inviteDto);
        assertNotNull(inviteDto.getCode());

        GroupInviteLink validLink = GroupInviteLink.builder()
                .id(inviteDto.getId())
                .group(publicGroup)
                .code(inviteDto.getCode())
                .createdBy(testUser)
                .maxUses(50)
                .usedCount(0)
                .expiresAt(Instant.now().plusSeconds(3600))
                .isRevoked(false)
                .build();

        when(groupInviteLinkRepository.findByCode(inviteDto.getCode())).thenReturn(Optional.of(validLink));
        when(groupMemberRepository.findByGroupIdAndUserId(groupId, otherUser.getId())).thenReturn(Optional.empty());

        GroupSummaryDto joinResult = groupService.joinViaInvite(inviteDto.getCode(), otherUser);
        assertNotNull(joinResult);
        assertEquals(1, validLink.getUsedCount());
        assertEquals(2, publicGroup.getMemberCount());
    }
}
