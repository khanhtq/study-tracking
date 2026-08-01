package com.studytracker.service;

import com.studytracker.dto.SessionManualRequest;
import com.studytracker.dto.SessionStopResponse;
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
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StudySessionServiceTest {

    @Mock
    private StudySessionRepository studySessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private XpService xpService;

    @InjectMocks
    private StudySessionService studySessionService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .currentLevel(1)
                .currentXp(0)
                .totalXp(0L)
                .build();
    }

    @Test
    void createManualSession_ShouldThrowException_WhenStartedAtIsInFuture() {
        SessionManualRequest request = new SessionManualRequest();
        request.setSubject("Math");
        request.setDurationSeconds(3600);
        request.setStartedAt(Instant.now().plusSeconds(3600)); // Future time

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> studySessionService.createManualSession(testUser, request)
        );

        assertTrue(exception.getMessage().toLowerCase().contains("future"));
        verify(studySessionRepository, never()).save(any());
    }

    @Test
    void createManualSession_ShouldThrowException_WhenEndedAtIsInFuture() {
        SessionManualRequest request = new SessionManualRequest();
        request.setSubject("Math");
        request.setDurationSeconds(7200); // 2 hours
        // Started 1 hour ago, so ends 1 hour in the future
        request.setStartedAt(Instant.now().minusSeconds(3600));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> studySessionService.createManualSession(testUser, request)
        );

        assertTrue(exception.getMessage().toLowerCase().contains("future"));
        verify(studySessionRepository, never()).save(any());
    }

    @Test
    void createManualSession_ShouldThrowException_WhenOverlappingSessionExists() {
        SessionManualRequest request = new SessionManualRequest();
        request.setSubject("Math");
        request.setDurationSeconds(3600);
        request.setStartedAt(Instant.now().minusSeconds(7200));

        when(studySessionRepository.existsOverlappingSession(eq(testUser), any(), any(), any()))
                .thenReturn(true);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> studySessionService.createManualSession(testUser, request)
        );

        assertTrue(exception.getMessage().toLowerCase().contains("overlaps"));
        verify(studySessionRepository, never()).save(any());
    }

    @Test
    void createManualSession_ShouldSucceed_WhenValidNonOverlappingPastSession() {
        Instant startedAt = Instant.now().minusSeconds(7200);
        int duration = 3600;

        SessionManualRequest request = new SessionManualRequest();
        request.setSubject("Math");
        request.setDurationSeconds(duration);
        request.setStartedAt(startedAt);

        when(studySessionRepository.existsOverlappingSession(eq(testUser), any(), any(), any()))
                .thenReturn(false);

        when(xpService.calculateXpEarned(eq(duration), any())).thenReturn(660);
        when(studySessionRepository.save(any(StudySession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = studySessionService.createManualSession(testUser, request);

        assertNotNull(response);
        assertEquals("Math", response.getSubject());
        assertEquals(3600, response.getDurationSeconds());
        assertEquals(660, response.getXpEarned());
        assertEquals(SessionSource.MANUAL, response.getSource());

        verify(xpService).addXp(testUser, 660);
        verify(studySessionRepository).save(any(StudySession.class));
    }

    @Test
    void stopSession_ShouldCapEndedAtToLastHeartbeat_WhenInactivityExceeds2Minutes() {
        UUID sessionId = UUID.randomUUID();
        Instant startedAt = Instant.now().minusSeconds(7200); // Started 2 hours ago
        Instant lastHeartbeatAt = Instant.now().minusSeconds(3600); // Last heartbeat 1 hour ago (inactive > 120s)

        StudySession session = StudySession.builder()
                .id(sessionId)
                .user(testUser)
                .subject("Physics")
                .source(SessionSource.TIMER)
                .startedAt(startedAt)
                .lastHeartbeatAt(lastHeartbeatAt)
                .build();

        when(studySessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(xpService.calculateXpEarned(anyInt(), any())).thenReturn(660);
        when(xpService.addXp(any(), anyInt()))
                .thenReturn(new XpService.XpCalculationResult(1, 1, 0, 660, 100, false));

        SessionStopResponse response = studySessionService.stopSession(testUser, sessionId);

        assertNotNull(response);
        // Duration should be between startedAt and lastHeartbeatAt (3600s), NOT 7200s!
        assertEquals(3600, response.getDurationSeconds());
        assertEquals(lastHeartbeatAt, session.getEndedAt());
    }
}
