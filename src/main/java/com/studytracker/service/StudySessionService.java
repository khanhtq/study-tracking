package com.studytracker.service;

import com.studytracker.dto.SessionManualRequest;
import com.studytracker.dto.SessionStartRequest;
import com.studytracker.dto.SessionStopResponse;
import com.studytracker.dto.StudySessionResponse;
import com.studytracker.model.SessionSource;
import com.studytracker.model.StudySession;
import com.studytracker.model.User;
import com.studytracker.repository.StudySessionRepository;
import com.studytracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudySessionService {

    private final StudySessionRepository studySessionRepository;
    private final UserRepository userRepository;
    private final XpService xpService;

    private static final int MAX_DURATION_SECONDS = 43200; // 12 hours

    /**
     * Start a new study session in timer mode.
     */
    @Transactional
    public StudySessionResponse startSession(User user, SessionStartRequest request) {
        String subject = request != null ? request.getSubject() : null;
        String studyMethod = (request != null && request.getStudyMethod() != null && !request.getStudyMethod().isBlank())
                ? request.getStudyMethod() : "FREE_MODE";
        Integer targetDurationSeconds = request != null ? request.getTargetDurationSeconds() : null;

        // Check whether the user already has an active session.
        Optional<StudySession> activeSessionOpt = studySessionRepository.findByUserAndEndedAtIsNull(user);
        if (activeSessionOpt.isPresent()) {
            // If a session is already running, return it.
            return mapToResponse(activeSessionOpt.get());
        }

        Instant now = Instant.now();

        // Prevent overlap with previously recorded manual sessions.
        if (studySessionRepository.existsOverlappingSession(user, now, now.plusSeconds(1), null)) {
            throw new IllegalArgumentException("Cannot start a new session because it overlaps with another study session.");
        }

        StudySession session = StudySession.builder()
                .user(user)
                .subject(subject != null ? subject.trim() : null)
                .studyMethod(studyMethod)
                .targetDurationSeconds(targetDurationSeconds)
                .isCompleted(false)
                .startedAt(now)
                .lastHeartbeatAt(now)
                .source(SessionSource.TIMER)
                .build();

        StudySession saved = studySessionRepository.save(session);
        return mapToResponse(saved);
    }

    /**
     * Backward-compatible overload for calls that only provide a subject.
     */
    @Transactional
    public StudySessionResponse startSession(User user, String subject) {
        SessionStartRequest req = new SessionStartRequest();
        req.setSubject(subject);
        return startSession(user, req);
    }

    /**
     * Send a heartbeat to update the session's most recent activity time.
     */
    @Transactional
    public void heartbeat(User user, UUID sessionId) {
        StudySession session = studySessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with id: " + sessionId));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Session does not belong to this user");
        }

        if (session.getEndedAt() != null) {
            return; // The session has already ended, so ignore the heartbeat.
        }

        session.setLastHeartbeatAt(Instant.now());
        studySessionRepository.save(session);
    }

    /**
     * Stop the currently running study session.
     */
    @Transactional
    public SessionStopResponse stopSession(User user, UUID sessionId) {
        StudySession session = studySessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with id: " + sessionId));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Session does not belong to this user");
        }

        if (session.getEndedAt() != null) {
            throw new IllegalArgumentException("Session is already stopped");
        }

        Instant endedAt = Instant.now();

        // Anti-cheat: if no heartbeat arrives for more than 2 minutes (120s),
        // clamp endedAt to the last heartbeat time to avoid a stuck session.
        Instant lastActiveTime = session.getLastHeartbeatAt() != null ? session.getLastHeartbeatAt() : session.getStartedAt();
        if (Duration.between(lastActiveTime, endedAt).getSeconds() > 120) {
            endedAt = lastActiveTime;
        }

        int durationSeconds = (int) Duration.between(session.getStartedAt(), endedAt).toSeconds();
        
        // Prevent overnight sessions from running too long (maximum 12h).
        if (durationSeconds > MAX_DURATION_SECONDS) {
            durationSeconds = MAX_DURATION_SECONDS;
            endedAt = session.getStartedAt().plusSeconds(MAX_DURATION_SECONDS);
        }
        
        if (durationSeconds < 1) {
            durationSeconds = 1; // Minimum duration is 1 second.
        }

        int baseXp = xpService.calculateXpEarned(durationSeconds);
        boolean isCompleted = false;
        int finalXp = baseXp;

        // Award a 15% XP bonus if the user studies for the preset duration.
        if (session.getTargetDurationSeconds() != null && session.getTargetDurationSeconds() > 0) {
            if (durationSeconds >= (session.getTargetDurationSeconds() - 5)) {
                isCompleted = true;
                finalXp = (int) Math.round(baseXp * 1.15);
            }
        }
        
        // Add XP and update the user's level.
        XpService.XpCalculationResult xpResult = xpService.addXp(user, finalXp);
        userRepository.save(user);

        session.setEndedAt(endedAt);
        session.setDurationSeconds(durationSeconds);
        session.setXpEarned(finalXp);
        session.setIsCompleted(isCompleted);
        studySessionRepository.save(session);

        return SessionStopResponse.builder()
                .sessionId(session.getId())
                .subject(session.getSubject())
                .durationSeconds(durationSeconds)
                .xpEarned(finalXp)
                .studyMethod(session.getStudyMethod())
                .targetDurationSeconds(session.getTargetDurationSeconds())
                .isCompleted(isCompleted)
                .leveledUp(xpResult.leveledUp())
                .levelBefore(xpResult.levelBefore())
                .levelAfter(xpResult.levelAfter())
                .xpBefore(xpResult.xpBefore())
                .xpAfter(xpResult.xpAfter())
                .xpRequiredForNextLevel(xpResult.xpRequiredForNextLevel())
                .build();
    }

    /**
     * Manually record a completed study session.
     */
    @Transactional
    public StudySessionResponse createManualSession(User user, SessionManualRequest request) {
        Instant startedAt = request.getStartedAt();
        int durationSeconds = request.getDurationSeconds();
        
        if (startedAt == null) {
            throw new IllegalArgumentException("Start time must not be empty.");
        }

        if (durationSeconds < 1) {
            throw new IllegalArgumentException("Study session duration must be at least 1 second.");
        }

        if (durationSeconds > MAX_DURATION_SECONDS) {
            throw new IllegalArgumentException("Manual study session duration must not exceed 12 hours.");
        }

        Instant endedAt = startedAt.plusSeconds(durationSeconds);
        Instant nowWithTolerance = Instant.now().plusSeconds(60); // Allow 60 seconds of clock skew.

        if (startedAt.isAfter(nowWithTolerance)) {
            throw new IllegalArgumentException("Study start time cannot be in the future.");
        }

        if (endedAt.isAfter(nowWithTolerance)) {
            throw new IllegalArgumentException("Study session end time cannot be in the future.");
        }

        // Anti-cheat: check whether the [startedAt, endedAt] range overlaps with any other session for the user.
        if (studySessionRepository.existsOverlappingSession(user, startedAt, endedAt, null)) {
            throw new IllegalArgumentException("This study period overlaps with another session.");
        }

        int xpEarned = xpService.calculateXpEarned(durationSeconds);

        // Add XP and update the user's level.
        xpService.addXp(user, xpEarned);
        userRepository.save(user);

        StudySession session = StudySession.builder()
                .user(user)
                .subject(request.getSubject() != null ? request.getSubject().trim() : null)
                .studyMethod("FREE_MODE")
                .startedAt(startedAt)
                .endedAt(endedAt)
                .durationSeconds(durationSeconds)
                .xpEarned(xpEarned)
                .source(SessionSource.MANUAL)
                .build();

        StudySession saved = studySessionRepository.save(session);
        return mapToResponse(saved);
    }

    /**
     * Get the active session, if any.
     */
    public Optional<StudySessionResponse> getActiveSession(User user) {
        return studySessionRepository.findByUserAndEndedAtIsNull(user)
                .map(this::mapToResponse);
    }

    /**
     * Get the user's study session history.
     */
    public List<StudySessionResponse> getSessionsHistory(User user) {
        return studySessionRepository.findByUserOrderByStartedAtDesc(user)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private StudySessionResponse mapToResponse(StudySession session) {
        return StudySessionResponse.builder()
                .id(session.getId())
                .subject(session.getSubject())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .durationSeconds(session.getDurationSeconds())
                .xpEarned(session.getXpEarned())
                .source(session.getSource())
                .studyMethod(session.getStudyMethod())
                .targetDurationSeconds(session.getTargetDurationSeconds())
                .isCompleted(session.getIsCompleted())
                .lastHeartbeatAt(session.getLastHeartbeatAt())
                .createdAt(session.getCreatedAt())
                .build();
    }
}
