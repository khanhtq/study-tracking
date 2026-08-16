package com.studytracker.service;

import com.studytracker.dto.CountdownDto;
import com.studytracker.dto.CreateCountdownRequest;
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
}
