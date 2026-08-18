package com.studytracker.service;

import com.studytracker.dto.AvailableCountdownDto;
import com.studytracker.dto.GroupCountdownDto;
import com.studytracker.dto.LinkCountdownRequest;
import com.studytracker.model.*;
import com.studytracker.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class GroupCountdownServiceTest {

    @Mock
    private GroupCountdownLinkRepository groupCountdownLinkRepository;

    @Mock
    private ChatGroupRepository chatGroupRepository;

    @Mock
    private GroupMemberRepository groupMemberRepository;

    @Mock
    private SystemPresetExamRepository systemPresetExamRepository;

    @Mock
    private CountdownEventRepository countdownEventRepository;

    @Mock
    private GroupMessageRepository groupMessageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private GroupCountdownService groupCountdownService;

    private User owner;
    private User regularMember;
    private ChatGroup group;
    private SystemPresetExam presetExam;
    private CountdownEvent customEvent;

    @BeforeEach
    void setUp() {
        owner = User.builder()
                .id(UUID.randomUUID())
                .email("groupowner@test.com")
                .displayName("Group Owner")
                .role(Role.ROLE_USER)
                .build();

        regularMember = User.builder()
                .id(UUID.randomUUID())
                .email("member1@test.com")
                .displayName("Member One")
                .role(Role.ROLE_USER)
                .build();

        group = ChatGroup.builder()
                .id(UUID.randomUUID())
                .name("Nhóm Học Toán 2027")
                .owner(owner)
                .privacy(GroupPrivacy.PUBLIC)
                .build();

        presetExam = SystemPresetExam.builder()
                .id(1L)
                .examCode("THPT_QG_2027")
                .title("Kỳ thi Tốt nghiệp THPT Quốc Gia 2027")
                .category("exam")
                .color("indigo")
                .targetDate(Instant.now().plus(300, ChronoUnit.DAYS))
                .isOfficialDate(true)
                .build();

        customEvent = CountdownEvent.builder()
                .id(UUID.randomUUID())
                .user(owner)
                .title("Thi thử Lần 1")
                .category("custom")
                .color("emerald")
                .targetDate(Instant.now().plus(40, ChronoUnit.DAYS))
                .build();
    }

    @Test
    @DisplayName("Lấy danh sách sự kiện đếm ngược của nhóm thành công")
    void testGetGroupCountdowns() {
        GroupCountdownLink link = GroupCountdownLink.builder()
                .id(UUID.randomUUID())
                .group(group)
                .presetExam(presetExam)
                .createdBy(owner)
                .createdAt(Instant.now())
                .build();

        when(chatGroupRepository.findById(group.getId())).thenReturn(Optional.of(group));
        when(groupCountdownLinkRepository.findByGroupIdWithDetails(group.getId())).thenReturn(List.of(link));

        List<GroupCountdownDto> result = groupCountdownService.getGroupCountdowns(group.getId(), owner);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Kỳ thi Tốt nghiệp THPT Quốc Gia 2027", result.get(0).getTitle());
        assertTrue(result.get(0).getDaysRemaining() > 0);
    }

    @Test
    @DisplayName("Lấy danh sách các sự kiện có thể liên kết thành công")
    void testGetAvailableCountdowns() {
        GroupMember ownerMember = GroupMember.builder()
                .id(UUID.randomUUID())
                .group(group)
                .user(owner)
                .role(GroupRole.OWNER)
                .status(GroupMemberStatus.ACTIVE)
                .build();

        when(groupMemberRepository.findByGroupIdAndUserId(group.getId(), owner.getId()))
                .thenReturn(Optional.of(ownerMember));
        when(groupCountdownLinkRepository.findByGroupIdWithDetails(group.getId()))
                .thenReturn(List.of());
        when(systemPresetExamRepository.findAll()).thenReturn(List.of(presetExam));
        when(countdownEventRepository.findByUserIdAndTargetDateAfterOrderByTargetDateAsc(eq(owner.getId()), any(Instant.class)))
                .thenReturn(List.of(customEvent));

        List<AvailableCountdownDto> available = groupCountdownService.getAvailableCountdowns(group.getId(), owner);

        assertNotNull(available);
        assertEquals(2, available.size());
        assertFalse(available.get(0).isAlreadyLinked());
    }

    @Test
    @DisplayName("Trưởng nhóm liên kết kỳ thi hệ thống vào nhóm thành công")
    void testLinkPresetCountdown_Success() {
        GroupMember ownerMember = GroupMember.builder()
                .id(UUID.randomUUID())
                .group(group)
                .user(owner)
                .role(GroupRole.OWNER)
                .status(GroupMemberStatus.ACTIVE)
                .build();

        when(chatGroupRepository.findById(group.getId())).thenReturn(Optional.of(group));
        when(groupMemberRepository.findByGroupIdAndUserId(group.getId(), owner.getId()))
                .thenReturn(Optional.of(ownerMember));
        when(systemPresetExamRepository.findById(1L)).thenReturn(Optional.of(presetExam));
        when(groupCountdownLinkRepository.findByGroupIdAndPresetExamId(group.getId(), 1L))
                .thenReturn(Optional.empty());

        GroupCountdownLink savedLink = GroupCountdownLink.builder()
                .id(UUID.randomUUID())
                .group(group)
                .presetExam(presetExam)
                .createdBy(owner)
                .createdAt(Instant.now())
                .build();

        when(groupCountdownLinkRepository.save(any(GroupCountdownLink.class))).thenReturn(savedLink);
        when(groupMessageRepository.save(any(GroupMessage.class))).thenAnswer(i -> {
            GroupMessage m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            m.setCreatedAt(Instant.now());
            return m;
        });

        LinkCountdownRequest request = LinkCountdownRequest.builder()
                .presetExamId(1L)
                .build();

        GroupCountdownDto result = groupCountdownService.linkCountdown(group.getId(), request, owner);

        assertNotNull(result);
        assertEquals("Kỳ thi Tốt nghiệp THPT Quốc Gia 2027", result.getTitle());
        verify(groupCountdownLinkRepository, times(1)).save(any(GroupCountdownLink.class));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/group." + group.getId() + ".messages"), any(Object.class));
    }

    @Test
    @DisplayName("Thành viên thông thường không có quyền link sự kiện -> ném SecurityException")
    void testLinkCountdown_ForbiddenForRegularMember() {
        GroupMember member = GroupMember.builder()
                .id(UUID.randomUUID())
                .group(group)
                .user(regularMember)
                .role(GroupRole.MEMBER)
                .status(GroupMemberStatus.ACTIVE)
                .build();

        when(chatGroupRepository.findById(group.getId())).thenReturn(Optional.of(group));
        when(groupMemberRepository.findByGroupIdAndUserId(group.getId(), regularMember.getId()))
                .thenReturn(Optional.of(member));

        LinkCountdownRequest request = LinkCountdownRequest.builder().presetExamId(1L).build();

        assertThrows(SecurityException.class, () ->
                groupCountdownService.linkCountdown(group.getId(), request, regularMember)
        );
    }

    @Test
    @DisplayName("Liên kết sự kiện đã tồn tại trong nhóm -> ném IllegalArgumentException")
    void testLinkCountdown_AlreadyLinked() {
        GroupMember ownerMember = GroupMember.builder()
                .id(UUID.randomUUID())
                .group(group)
                .user(owner)
                .role(GroupRole.OWNER)
                .status(GroupMemberStatus.ACTIVE)
                .build();

        when(chatGroupRepository.findById(group.getId())).thenReturn(Optional.of(group));
        when(groupMemberRepository.findByGroupIdAndUserId(group.getId(), owner.getId()))
                .thenReturn(Optional.of(ownerMember));
        when(systemPresetExamRepository.findById(1L)).thenReturn(Optional.of(presetExam));
        when(groupCountdownLinkRepository.findByGroupIdAndPresetExamId(group.getId(), 1L))
                .thenReturn(Optional.of(mock(GroupCountdownLink.class)));

        LinkCountdownRequest request = LinkCountdownRequest.builder().presetExamId(1L).build();

        assertThrows(IllegalArgumentException.class, () ->
                groupCountdownService.linkCountdown(group.getId(), request, owner)
        );
    }

    @Test
    @DisplayName("Hủy liên kết sự kiện đếm ngược thành công")
    void testUnlinkCountdown_Success() {
        GroupMember ownerMember = GroupMember.builder()
                .id(UUID.randomUUID())
                .group(group)
                .user(owner)
                .role(GroupRole.OWNER)
                .status(GroupMemberStatus.ACTIVE)
                .build();

        UUID linkId = UUID.randomUUID();
        GroupCountdownLink link = GroupCountdownLink.builder()
                .id(linkId)
                .group(group)
                .presetExam(presetExam)
                .createdBy(owner)
                .build();

        when(chatGroupRepository.findById(group.getId())).thenReturn(Optional.of(group));
        when(groupMemberRepository.findByGroupIdAndUserId(group.getId(), owner.getId()))
                .thenReturn(Optional.of(ownerMember));
        when(groupCountdownLinkRepository.findById(linkId)).thenReturn(Optional.of(link));
        when(groupMessageRepository.save(any(GroupMessage.class))).thenAnswer(i -> {
            GroupMessage m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            m.setCreatedAt(Instant.now());
            return m;
        });

        groupCountdownService.unlinkCountdown(group.getId(), linkId, owner);

        verify(groupCountdownLinkRepository, times(1)).delete(link);
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/group." + group.getId() + ".messages"), any(Object.class));
    }

    @Test
    @DisplayName("Tự động phát bản tin đếm ngược hàng ngày tới nhóm chat")
    void testProcessDailyCountdownBroadcast() {
        GroupCountdownLink link = GroupCountdownLink.builder()
                .id(UUID.randomUUID())
                .group(group)
                .presetExam(presetExam)
                .createdBy(owner)
                .lastDailyNotifiedAt(null)
                .build();

        when(groupCountdownLinkRepository.findAllActiveLinksWithDetails()).thenReturn(List.of(link));
        when(groupMessageRepository.save(any(GroupMessage.class))).thenAnswer(i -> {
            GroupMessage m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            m.setCreatedAt(Instant.now());
            return m;
        });

        groupCountdownService.processDailyCountdownBroadcast();

        verify(groupMessageRepository, times(1)).save(any(GroupMessage.class));
        verify(groupCountdownLinkRepository, times(1)).save(any(GroupCountdownLink.class));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/group." + group.getId() + ".messages"), any(Object.class));
    }
}
