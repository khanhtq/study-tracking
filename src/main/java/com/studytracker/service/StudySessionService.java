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
     * Start a new study session (Timer mode).
     */
    @Transactional
    public StudySessionResponse startSession(User user, SessionStartRequest request) {
        String subject = request != null ? request.getSubject() : null;
        String studyMethod = (request != null && request.getStudyMethod() != null && !request.getStudyMethod().isBlank())
                ? request.getStudyMethod() : "FREE_MODE";
        Integer targetDurationSeconds = request != null ? request.getTargetDurationSeconds() : null;

        // Check if the user has an active session that has not ended yet
        Optional<StudySession> activeSessionOpt = studySessionRepository.findByUserAndEndedAtIsNull(user);
        if (activeSessionOpt.isPresent()) {
            // If an active session exists, return it
            return mapToResponse(activeSessionOpt.get());
        }

        Instant now = Instant.now();

        // Anti-Cheat: Prevent overlapping time intervals with existing study sessions
        if (studySessionRepository.existsOverlappingSession(user, now, now.plusSeconds(1), null)) {
            throw new IllegalArgumentException("Cannot start a new session because it overlaps with an existing study session interval");
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
     * Overload for backward compatibility when starting with only a subject.
     */
    @Transactional
    public StudySessionResponse startSession(User user, String subject) {
        SessionStartRequest req = new SessionStartRequest();
        req.setSubject(subject);
        return startSession(user, req);
    }

    /**
     * Send heartbeat to update the last active time of the session.
     */
    @Transactional
    public void heartbeat(User user, UUID sessionId) {
        StudySession session = studySessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with id: " + sessionId));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Session does not belong to this user");
        }

        if (session.getEndedAt() != null) {
            return; // Session is already ended, ignore heartbeat
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

        // Anti-Cheat: If more than 2 minutes (120s) passed without a heartbeat, cap endedAt to lastHeartbeatAt to prevent idling
        Instant lastActiveTime = session.getLastHeartbeatAt() != null ? session.getLastHeartbeatAt() : session.getStartedAt();
        if (Duration.between(lastActiveTime, endedAt).getSeconds() > 120) {
            endedAt = lastActiveTime;
        }

        int durationSeconds = (int) Duration.between(session.getStartedAt(), endedAt).toSeconds();
        
        // Prevent overnight idling (max duration cap of 12 hours)
        if (durationSeconds > MAX_DURATION_SECONDS) {
            durationSeconds = MAX_DURATION_SECONDS;
            endedAt = session.getStartedAt().plusSeconds(MAX_DURATION_SECONDS);
        }
        
        if (durationSeconds < 1) {
            durationSeconds = 1; // Minimum 1 second
        }

        int baseXp = xpService.calculateXpEarned(durationSeconds, user);
        boolean isCompleted = false;
        int finalXp = baseXp;

        // Grant 15% Bonus XP if user completed the preset target duration
        if (session.getTargetDurationSeconds() != null && session.getTargetDurationSeconds() > 0) {
            if (durationSeconds >= (session.getTargetDurationSeconds() - 5)) {
                isCompleted = true;
                finalXp = (int) Math.round(baseXp * 1.15);
            }
        }
        
        // Add XP and update user level
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
     * Manually log a completed study session.
     */
    @Transactional
    public StudySessionResponse createManualSession(User user, SessionManualRequest request) {
        Instant startedAt = request.getStartedAt();
        int durationSeconds = request.getDurationSeconds();
        
        if (startedAt == null) {
            throw new IllegalArgumentException("Start time cannot be null");
        }

        if (durationSeconds < 1) {
            throw new IllegalArgumentException("Session duration must be at least 1 second");
        }

        if (durationSeconds > MAX_DURATION_SECONDS) {
            throw new IllegalArgumentException("Manual session duration cannot exceed 12 hours");
        }

        Instant endedAt = startedAt.plusSeconds(durationSeconds);
        Instant nowWithTolerance = Instant.now().plusSeconds(60); // 60s clock skew tolerance

        if (startedAt.isAfter(nowWithTolerance)) {
            throw new IllegalArgumentException("Start time cannot be in the future");
        }

        if (endedAt.isAfter(nowWithTolerance)) {
            throw new IllegalArgumentException("End time cannot be in the future");
        }

        // Anti-Cheat: Prevent overlapping time interval [startedAt, endedAt] with existing user sessions
        if (studySessionRepository.existsOverlappingSession(user, startedAt, endedAt, null)) {
            throw new IllegalArgumentException("This study session interval overlaps with an existing session");
        }

        int xpEarned = xpService.calculateXpEarned(durationSeconds, user);

        // Add XP and update user level
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
     * Get active session for user (if any).
     */
    public Optional<StudySessionResponse> getActiveSession(User user) {
        return studySessionRepository.findByUserAndEndedAtIsNull(user)
                .map(this::mapToResponse);
    }

    /**
     * Get user study session history.
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
