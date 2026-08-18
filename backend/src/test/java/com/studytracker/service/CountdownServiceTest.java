package com.studytracker.service;

import com.studytracker.dto.*;
import com.studytracker.model.CountdownEvent;
import com.studytracker.model.SystemPresetExam;
import com.studytracker.model.User;
import com.studytracker.repository.CountdownEventRepository;
import com.studytracker.repository.SystemPresetExamRepository;
import com.studytracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CountdownServiceTest {

    @Mock
    private CountdownEventRepository countdownEventRepository;

    @Mock
    private SystemPresetExamRepository presetExamRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CountdownService countdownService;

    private User testUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        testUser = User.builder()
                .id(userId)
                .email("student@test.com")
                .displayName("Student Test")
                .build();
    }

    @Test
    @DisplayName("User có thể theo dõi nhiều sự kiện cùng lúc mà không bị ghi đè")
    void shouldAllowUserToTrackMultipleCountdowns() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(presetExamRepository.findByExamCode("THPT_QG_2027")).thenReturn(Optional.of(
                SystemPresetExam.builder().examCode("THPT_QG_2027").title("THPT QG 2027").targetDate(Instant.now().plusSeconds(86400 * 100)).build()
        ));
        when(presetExamRepository.findByExamCode("DGNL_HCMUT_2027")).thenReturn(Optional.of(
                SystemPresetExam.builder().examCode("DGNL_HCMUT_2027").title("DGNL HCMUT 2027").targetDate(Instant.now().plusSeconds(86400 * 50)).build()
        ));

        when(countdownEventRepository.findByUserIdAndPresetExamCode(eq(userId), anyString())).thenReturn(Optional.empty());

        when(countdownEventRepository.saveAndFlush(any(CountdownEvent.class))).thenAnswer(invocation -> {
            CountdownEvent e = invocation.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        // 1. Track Event 1: THPT QG (Pinned)
        CreateCountdownRequest req1 = CreateCountdownRequest.builder()
                .presetExamCode("THPT_QG_2027")
                .title("Kỳ thi Tốt nghiệp THPT Quốc Gia 2027")
                .targetDate(Instant.now().plusSeconds(86400 * 100))
                .isPinned(true)
                .build();
        CountdownDto dto1 = countdownService.createCountdown(userId, req1);
        assertNotNull(dto1);
        assertEquals("THPT_QG_2027", dto1.getPresetExamCode());
        assertTrue(dto1.getIsPinned());

        // Verify unpin was called for first pinned event
        verify(countdownEventRepository, times(1)).unpinAllForUser(userId);

        // 2. Track Event 2: DGNL HCMUT (Not pinned, keeping Event 1 as main pin)
        CreateCountdownRequest req2 = CreateCountdownRequest.builder()
                .presetExamCode("DGNL_HCMUT_2027")
                .title("Kỳ thi ĐGNL Bách Khoa HCMUT 2027")
                .targetDate(Instant.now().plusSeconds(86400 * 50))
                .isPinned(false)
                .build();
        CountdownDto dto2 = countdownService.createCountdown(userId, req2);
        assertNotNull(dto2);
        assertEquals("DGNL_HCMUT_2027", dto2.getPresetExamCode());
        assertFalse(dto2.getIsPinned());

        // unpinAllForUser should NOT be called again because isPinned=false
        verify(countdownEventRepository, times(1)).unpinAllForUser(userId);
    }

    @Test
    @DisplayName("Tự động tạo preset trong system_preset_exams nếu chưa tồn tại để tránh lỗi Foreign Key")
    void shouldAutoCreatePresetExamWhenNotFoundToPreventForeignKeyError() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(presetExamRepository.findByExamCode("CUSTOM_PRESET_999")).thenReturn(Optional.empty());
        when(countdownEventRepository.findByUserIdAndPresetExamCode(userId, "CUSTOM_PRESET_999")).thenReturn(Optional.empty());

        when(countdownEventRepository.saveAndFlush(any(CountdownEvent.class))).thenAnswer(invocation -> {
            CountdownEvent e = invocation.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        CreateCountdownRequest request = CreateCountdownRequest.builder()
                .presetExamCode("CUSTOM_PRESET_999")
                .title("Kỳ thi Olympic Tin Học 2027")
                .targetDate(Instant.now().plusSeconds(86400 * 30))
                .isPinned(false)
                .build();

        CountdownDto dto = countdownService.createCountdown(userId, request);

        assertNotNull(dto);
        assertEquals("CUSTOM_PRESET_999", dto.getPresetExamCode());

        // Verify SystemPresetExam was saved first to satisfy Foreign Key
        ArgumentCaptor<SystemPresetExam> presetCaptor = ArgumentCaptor.forClass(SystemPresetExam.class);
        verify(presetExamRepository).saveAndFlush(presetCaptor.capture());
        assertEquals("CUSTOM_PRESET_999", presetCaptor.getValue().getExamCode());
    }

    @Test
    @DisplayName("Ghim sự kiện hoạt động chính xác với cả UUID và presetExamCode")
    void shouldPinCountdownCorrectlyWithUUIDAndPresetCode() {
        UUID eventId = UUID.randomUUID();
        CountdownEvent event = CountdownEvent.builder()
                .id(eventId)
                .user(testUser)
                .presetExamCode("DGNL_HCMUT_2027")
                .title("Kỳ thi ĐGNL Bách Khoa HCMUT 2027")
                .targetDate(Instant.now().plusSeconds(86400 * 50))
                .isPinned(false)
                .build();

        when(countdownEventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(countdownEventRepository.saveAndFlush(any(CountdownEvent.class))).thenReturn(event);

        // Pin by UUID
        CountdownDto pinnedDto = countdownService.pinCountdown(userId, eventId.toString());
        assertNotNull(pinnedDto);
        assertTrue(pinnedDto.getIsPinned());
        verify(countdownEventRepository).unpinAllForUser(userId);

        // Pin by presetExamCode
        when(countdownEventRepository.findByUserIdAndPresetExamCode(userId, "DGNL_HCMUT_2027")).thenReturn(Optional.of(event));
        CountdownDto pinnedByCode = countdownService.pinCountdown(userId, "DGNL_HCMUT_2027");
        assertNotNull(pinnedByCode);
        assertTrue(pinnedByCode.getIsPinned());
    }

    @Test
    @DisplayName("Lấy danh sách các sự kiện còn hiệu lực của người dùng (bỏ qua sự kiện đã hết hạn)")
    void shouldReturnOnlyActiveCountdownsForUser() {
        CountdownEvent e1 = CountdownEvent.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .presetExamCode("THPT_QG_2027")
                .title("THPT QG")
                .targetDate(Instant.now().plusSeconds(86400 * 100))
                .isPinned(true)
                .build();

        when(countdownEventRepository.findByUserIdAndTargetDateAfterOrderByTargetDateAsc(eq(userId), any(Instant.class)))
                .thenReturn(List.of(e1));

        List<CountdownDto> result = countdownService.getUserCountdowns(userId);
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("THPT QG", result.get(0).getTitle());
    }

    @Test
    @DisplayName("Chính chủ KHÔNG THỂ xóa sự kiện cộng đồng khi sự kiện chưa kết thúc và vẫn còn người khác theo dõi")
    void shouldThrowExceptionWhenOwnerTriesToDeleteActivePresetWithOtherTrackers() {
        String communityCode = "COMMUNITY_MATH101";
        UUID eventId = UUID.randomUUID();

        CountdownEvent ownerEvent = CountdownEvent.builder()
                .id(eventId)
                .user(testUser)
                .presetExamCode(communityCode)
                .title("Thi thử Toán")
                .targetDate(Instant.now().plusSeconds(86400 * 10)) // Chưa kết thúc (10 ngày tới)
                .build();

        SystemPresetExam communityPreset = SystemPresetExam.builder()
                .examCode(communityCode)
                .title("Thi thử Toán")
                .targetDate(Instant.now().plusSeconds(86400 * 10))
                .createdByUser(testUser) // testUser is the owner
                .isCommunityEvent(true)
                .trackerCount(5) // Vẫn còn 5 người theo dõi (4 người khác + chính chủ)
                .build();

        when(countdownEventRepository.findById(eventId)).thenReturn(Optional.of(ownerEvent));
        when(presetExamRepository.findByExamCode(communityCode)).thenReturn(Optional.of(communityPreset));
        when(countdownEventRepository.countByPresetExamCode(communityCode)).thenReturn(5L);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            countdownService.deleteCountdown(userId, eventId.toString());
        });

        assertTrue(ex.getMessage().contains("Không thể xóa sự kiện"));
        verify(countdownEventRepository, never()).delete(any());
        verify(presetExamRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Chính chủ CÓ THỂ xóa sự kiện cộng đồng khi chỉ còn 1 người theo dõi (chính chủ)")
    void shouldCascadeDeleteCommunityPresetWhenOnlyOwnerIsTracking() {
        String communityCode = "COMMUNITY_MATH101";
        UUID eventId = UUID.randomUUID();

        CountdownEvent ownerEvent = CountdownEvent.builder()
                .id(eventId)
                .user(testUser)
                .presetExamCode(communityCode)
                .title("Thi thử Toán")
                .targetDate(Instant.now().plusSeconds(86400 * 10))
                .build();

        SystemPresetExam communityPreset = SystemPresetExam.builder()
                .examCode(communityCode)
                .title("Thi thử Toán")
                .targetDate(Instant.now().plusSeconds(86400 * 10))
                .createdByUser(testUser)
                .isCommunityEvent(true)
                .trackerCount(1) // Chỉ có 1 người theo dõi (chính chủ)
                .build();

        when(countdownEventRepository.findById(eventId)).thenReturn(Optional.of(ownerEvent));
        when(presetExamRepository.findByExamCode(communityCode)).thenReturn(Optional.of(communityPreset));
        when(countdownEventRepository.countByPresetExamCode(communityCode)).thenReturn(1L);

        countdownService.deleteCountdown(userId, eventId.toString());

        // Verify all tracker events deleted & preset deleted
        verify(countdownEventRepository).deleteByPresetExamCode(communityCode);
        verify(presetExamRepository).delete(communityPreset);
    }

    @Test
    @DisplayName("Khi người theo dõi bình thường xóa sự kiện thì luôn hủy theo dõi thành công")
    void shouldOnlyUntrackWhenNonOwnerDeletesCommunityPreset() {
        String communityCode = "COMMUNITY_PHYSICS101";
        UUID eventId = UUID.randomUUID();
        User otherOwner = User.builder().id(UUID.randomUUID()).email("owner@test.com").build();

        CountdownEvent trackerEvent = CountdownEvent.builder()
                .id(eventId)
                .user(testUser) // testUser is just a tracker
                .presetExamCode(communityCode)
                .title("Thi thử Lý")
                .targetDate(Instant.now().plusSeconds(86400 * 10))
                .build();

        SystemPresetExam communityPreset = SystemPresetExam.builder()
                .examCode(communityCode)
                .title("Thi thử Lý")
                .createdByUser(otherOwner) // otherOwner is the owner
                .isCommunityEvent(true)
                .trackerCount(10)
                .build();

        when(countdownEventRepository.findById(eventId)).thenReturn(Optional.of(trackerEvent));
        when(presetExamRepository.findByExamCode(communityCode)).thenReturn(Optional.of(communityPreset));

        countdownService.deleteCountdown(userId, eventId.toString());

        // Verify only tracker's countdownEvent deleted & count decremented, preset NOT deleted
        verify(presetExamRepository).decrementTrackerCount(communityCode);
        verify(countdownEventRepository).delete(trackerEvent);
        verify(presetExamRepository, never()).delete(communityPreset);
    }

    @Test
    @DisplayName("Người dùng có thể sửa sự kiện do chính mình tạo và đồng bộ sự kiện cộng đồng")
    void shouldAllowUserToUpdateOwnCountdownAndSyncCommunityPreset() {
        UUID eventId = UUID.randomUUID();
        String communityCode = "COMMUNITY_CHEM2027";

        CountdownEvent event = CountdownEvent.builder()
                .id(eventId)
                .user(testUser)
                .presetExamCode(communityCode)
                .title("Kỳ thi thử Hoá cũ")
                .targetDate(Instant.now().plusSeconds(86400 * 10))
                .note("Ghi chú cũ")
                .build();

        SystemPresetExam communityPreset = SystemPresetExam.builder()
                .examCode(communityCode)
                .title("Kỳ thi thử Hoá cũ")
                .targetDate(Instant.now().plusSeconds(86400 * 10))
                .createdByUser(testUser)
                .isCommunityEvent(true)
                .trackerCount(2)
                .build();

        CountdownEvent otherSubscriberEvent = CountdownEvent.builder()
                .id(UUID.randomUUID())
                .user(User.builder().id(UUID.randomUUID()).build())
                .presetExamCode(communityCode)
                .title("Kỳ thi thử Hoá cũ")
                .targetDate(Instant.now().plusSeconds(86400 * 10))
                .build();

        when(countdownEventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(presetExamRepository.findByExamCode(communityCode)).thenReturn(Optional.of(communityPreset));
        when(countdownEventRepository.findByPresetExamCode(communityCode)).thenReturn(List.of(event, otherSubscriberEvent));
        when(countdownEventRepository.saveAndFlush(any(CountdownEvent.class))).thenAnswer(i -> i.getArgument(0));

        Instant newDate = Instant.now().plusSeconds(86400 * 20);
        CreateCountdownRequest updateRequest = CreateCountdownRequest.builder()
                .title("Kỳ thi thử Hoá mới 2027")
                .targetDate(newDate)
                .note("Ghi chú mới")
                .color("amber")
                .build();

        CountdownDto updatedDto = countdownService.updateCountdown(userId, eventId.toString(), updateRequest);

        assertNotNull(updatedDto);
        assertEquals("Kỳ thi thử Hoá mới 2027", updatedDto.getTitle());
        assertEquals("Ghi chú mới", updatedDto.getNote());

        // Verify community preset was updated
        assertEquals("Kỳ thi thử Hoá mới 2027", communityPreset.getTitle());
        assertEquals("Ghi chú mới", communityPreset.getDescription());
        verify(presetExamRepository).save(communityPreset);

        // Verify other subscriber was synced
        assertEquals("Kỳ thi thử Hoá mới 2027", otherSubscriberEvent.getTitle());
        verify(countdownEventRepository).save(otherSubscriberEvent);
    }

    @Test
    @DisplayName("Từ chối chỉnh sửa khi người dùng chỉ đang theo dõi lịch của người khác hoặc lịch chính thức")
    void shouldRejectUpdateWhenUserIsNotTheCreatorOfPreset() {
        UUID eventId = UUID.randomUUID();
        String officialExamCode = "THPT_QG_2027";

        CountdownEvent subscriberEvent = CountdownEvent.builder()
                .id(eventId)
                .user(testUser)
                .presetExamCode(officialExamCode)
                .title("Kỳ thi THPT QG 2027")
                .targetDate(Instant.now().plusSeconds(86400 * 100))
                .build();

        SystemPresetExam officialPreset = SystemPresetExam.builder()
                .examCode(officialExamCode)
                .title("Kỳ thi THPT QG 2027")
                .targetDate(Instant.now().plusSeconds(86400 * 100))
                .createdByUser(null) // Official preset has no user owner
                .isOfficialDate(true)
                .build();

        when(countdownEventRepository.findById(eventId)).thenReturn(Optional.of(subscriberEvent));
        when(presetExamRepository.findByExamCode(officialExamCode)).thenReturn(Optional.of(officialPreset));

        CreateCountdownRequest updateRequest = CreateCountdownRequest.builder()
                .title("Tự ý đổi tên kỳ thi THPT QG")
                .targetDate(Instant.now().plusSeconds(86400 * 50))
                .build();

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            countdownService.updateCountdown(userId, eventId.toString(), updateRequest);
        });

        assertTrue(ex.getMessage().contains("Bạn chỉ có thể chỉnh sửa lịch do chính mình tạo"));
        verify(countdownEventRepository, never()).saveAndFlush(any());
        verify(presetExamRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin có toàn quyền tạo, sửa và xóa cưỡng chế preset kỳ thi bất kể số lượng người theo dõi")
    void shouldAllowAdminToCreateUpdateAndForceDeletePresetWithoutRestrictions() {
        User adminUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@studyxp.com")
                .displayName("Admin System")
                .role(com.studytracker.model.Role.ROLE_ADMIN)
                .build();

        // 1. Admin Create Preset
        AdminSavePresetRequest createReq = AdminSavePresetRequest.builder()
                .examCode("THPT_QG_2027")
                .title("Kỳ thi Tốt nghiệp THPT Quốc Gia 2027 (Admin)")
                .targetDate(Instant.now().plusSeconds(86400 * 300))
                .category("exam")
                .isOfficialDate(true)
                .build();

        when(presetExamRepository.existsByExamCode("THPT_QG_2027")).thenReturn(false);
        when(presetExamRepository.save(any(SystemPresetExam.class))).thenAnswer(inv -> inv.getArgument(0));

        var created = countdownService.adminCreatePreset(createReq, adminUser);
        assertNotNull(created);
        assertEquals("THPT_QG_2027", created.getExamCode());
        assertEquals(adminUser.getId().toString(), created.getCreatedByUserId());

        // 2. Admin Update Preset and sync to subscribers
        SystemPresetExam existing = SystemPresetExam.builder()
                .examCode("THPT_QG_2027")
                .title("THPT QG Old")
                .targetDate(Instant.now().plusSeconds(86400 * 100))
                .createdByUser(adminUser)
                .build();

        when(presetExamRepository.findByExamCode("THPT_QG_2027")).thenReturn(Optional.of(existing));

        CountdownEvent subEvent = CountdownEvent.builder()
                .id(UUID.randomUUID())
                .presetExamCode("THPT_QG_2027")
                .title("THPT QG Old")
                .targetDate(Instant.now().plusSeconds(86400 * 100))
                .build();
        when(countdownEventRepository.findByPresetExamCode("THPT_QG_2027")).thenReturn(List.of(subEvent));

        AdminSavePresetRequest updateReq = AdminSavePresetRequest.builder()
                .title("Kỳ thi Tốt nghiệp THPT Quốc Gia 2027 (Đã cập nhật)")
                .targetDate(Instant.now().plusSeconds(86400 * 350))
                .build();

        var updated = countdownService.adminUpdatePreset("THPT_QG_2027", updateReq);
        assertEquals("Kỳ thi Tốt nghiệp THPT Quốc Gia 2027 (Đã cập nhật)", updated.getTitle());
        verify(countdownEventRepository).save(subEvent);

        // 3. Admin Force Delete Preset (even if many trackers exist)
        countdownService.adminForceDeletePreset("THPT_QG_2027");
        verify(countdownEventRepository).deleteByPresetExamCode("THPT_QG_2027");
        verify(presetExamRepository).delete(existing);
    }
}
