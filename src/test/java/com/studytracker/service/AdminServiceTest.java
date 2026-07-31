package com.studytracker.service;

import com.studytracker.dto.SuspiciousUserAlertDto;
import com.studytracker.model.SessionSource;
import com.studytracker.model.StudySession;
import com.studytracker.model.User;
import com.studytracker.repository.StudySessionRepository;
import com.studytracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudySessionRepository studySessionRepository;

    @Mock
    private UserService userService;

    @Mock
    private LeaderboardService leaderboardService;

    @InjectMocks
    private AdminService adminService;

    private User normalUser;
    private User suspiciousUser;

    @BeforeEach
    void setUp() {
        normalUser = User.builder()
                .id(UUID.randomUUID())
                .email("normal@example.com")
                .displayName("Normal User")
                .currentLevel(1)
                .totalXp(100L)
                .build();

        suspiciousUser = User.builder()
                .id(UUID.randomUUID())
                .email("suspicious@example.com")
                .displayName("Suspicious User")
                .currentLevel(10)
                .totalXp(15000L)
                .build();
    }

    @Test
    void getSuspiciousUsers_ShouldReturnEmptyList_WhenUsersHaveNormalActivity() {
        when(userRepository.findAll()).thenReturn(List.of(normalUser));

        StudySession normalSession = StudySession.builder()
                .user(normalUser)
                .startedAt(Instant.now().minusSeconds(3600))
                .endedAt(Instant.now())
                .durationSeconds(3600)
                .xpEarned(660)
                .source(SessionSource.TIMER)
                .build();

        when(studySessionRepository.findAll()).thenReturn(List.of(normalSession));

        List<SuspiciousUserAlertDto> alerts = adminService.getSuspiciousUsers();

        assertNotNull(alerts);
        assertTrue(alerts.isEmpty());
    }

    @Test
    void getSuspiciousUsers_ShouldReturnHighSeverityAlert_WhenUserExceeds16HoursIn24h() {
        when(userRepository.findAll()).thenReturn(List.of(suspiciousUser));

        // 18 hours = 64800 seconds
        StudySession hugeSession = StudySession.builder()
                .user(suspiciousUser)
                .startedAt(Instant.now().minusSeconds(64800))
                .endedAt(Instant.now())
                .durationSeconds(64800)
                .xpEarned(11880)
                .source(SessionSource.TIMER)
                .build();

        when(studySessionRepository.findAll()).thenReturn(List.of(hugeSession));

        List<SuspiciousUserAlertDto> alerts = adminService.getSuspiciousUsers();

        assertNotNull(alerts);
        assertEquals(1, alerts.size());

        SuspiciousUserAlertDto alert = alerts.get(0);
        assertEquals(suspiciousUser.getId(), alert.getUserId());
        assertEquals("HIGH", alert.getSeverity());
        assertFalse(alert.getReasons().isEmpty());
    }

    @Test
    void banUser_ShouldSetBannedTrue_WhenUserIsNormal() {
        UUID userId = normalUser.getId();
        when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(normalUser));

        adminService.banUser(userId, "Cheating study time");

        assertTrue(normalUser.getBanned());
        assertEquals("Cheating study time", normalUser.getBanReason());
        assertNotNull(normalUser.getBannedAt());
        verify(userRepository).save(normalUser);
    }

    @Test
    void banUser_ShouldThrow_WhenUserIsAdmin() {
        User adminUser = User.builder()
                .id(UUID.randomUUID())
                .role(com.studytracker.model.Role.ROLE_ADMIN)
                .build();

        when(userRepository.findById(adminUser.getId())).thenReturn(java.util.Optional.of(adminUser));

        assertThrows(IllegalArgumentException.class, () -> adminService.banUser(adminUser.getId(), "Some reason"));
        verify(userRepository, never()).save(adminUser);
    }

    @Test
    void unbanUser_ShouldSetBannedFalse() {
        normalUser.setBanned(true);
        normalUser.setBanReason("Previous reason");
        when(userRepository.findById(normalUser.getId())).thenReturn(java.util.Optional.of(normalUser));

        adminService.unbanUser(normalUser.getId());

        assertFalse(normalUser.getBanned());
        assertNull(normalUser.getBanReason());
        assertNull(normalUser.getBannedAt());
        verify(userRepository).save(normalUser);
    }

    @Test
    void resetUserProgress_ShouldResetLevelAndXpAndDeleteSessions() {
        UUID userId = suspiciousUser.getId();
        when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(suspiciousUser));

        adminService.resetUserProgress(userId);

        assertEquals(1, suspiciousUser.getCurrentLevel());
        assertEquals(0, suspiciousUser.getCurrentXp());
        assertEquals(0L, suspiciousUser.getTotalXp());

        verify(studySessionRepository).deleteByUser(suspiciousUser);
        verify(userRepository).save(suspiciousUser);
        verify(leaderboardService).updateUserXpInRedis(userId, 0L);
    }

    @Test
    void resetUserProgress_ShouldThrow_WhenUserIsAdmin() {
        User adminUser = User.builder()
                .id(UUID.randomUUID())
                .role(com.studytracker.model.Role.ROLE_ADMIN)
                .build();

        when(userRepository.findById(adminUser.getId())).thenReturn(java.util.Optional.of(adminUser));

        assertThrows(IllegalArgumentException.class, () -> adminService.resetUserProgress(adminUser.getId()));
        verify(studySessionRepository, never()).deleteByUser(adminUser);
        verify(userRepository, never()).save(adminUser);
    }
}
