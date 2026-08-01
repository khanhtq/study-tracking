package com.studytracker.scheduler;

import com.studytracker.model.StudySession;
import com.studytracker.model.User;
import com.studytracker.repository.StudySessionRepository;
import com.studytracker.repository.UserRepository;
import com.studytracker.service.XpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class SessionHeartbeatScheduler {

    private final StudySessionRepository studySessionRepository;
    private final UserRepository userRepository;
    private final XpService xpService;

    private static final int MAX_DURATION_SECONDS = 43200; // 12 hours
    private static final int INACTIVITY_TIMEOUT_SECONDS = 60; // 1 minute cutoff

    /**
     * Tự động quét và chốt các session quá 1 phút không gửi heartbeat.
     * Chạy định kỳ mỗi 30 giây.
     */
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void cleanupInactiveSessions() {
        Instant cutoff = Instant.now().minusSeconds(INACTIVITY_TIMEOUT_SECONDS);

        List<StudySession> expiredWithHeartbeat = studySessionRepository
                .findByEndedAtIsNullAndLastHeartbeatAtBefore(cutoff);

        List<StudySession> expiredWithoutHeartbeat = studySessionRepository
                .findByEndedAtIsNullAndLastHeartbeatAtIsNullAndStartedAtBefore(cutoff);

        List<StudySession> expiredSessions = new ArrayList<>();
        expiredSessions.addAll(expiredWithHeartbeat);
        expiredSessions.addAll(expiredWithoutHeartbeat);

        if (expiredSessions.isEmpty()) {
            return;
        }

        log.info("Found {} inactive study session(s) to auto-close", expiredSessions.size());

        for (StudySession session : expiredSessions) {
            try {
                Instant endTimestamp = session.getLastHeartbeatAt() != null
                        ? session.getLastHeartbeatAt()
                        : session.getStartedAt();

                int durationSeconds = (int) Duration.between(session.getStartedAt(), endTimestamp).toSeconds();

                if (durationSeconds > MAX_DURATION_SECONDS) {
                    durationSeconds = MAX_DURATION_SECONDS;
                    endTimestamp = session.getStartedAt().plusSeconds(MAX_DURATION_SECONDS);
                }

                if (durationSeconds < 1) {
                    durationSeconds = 1;
                }

                int xpEarned = xpService.calculateXpEarned(durationSeconds);

                User user = session.getUser();
                xpService.addXp(user, xpEarned);
                userRepository.save(user);

                session.setEndedAt(endTimestamp);
                session.setDurationSeconds(durationSeconds);
                session.setXpEarned(xpEarned);
                studySessionRepository.save(session);

                log.info("Auto-closed session {} for user {}. Duration: {}s, XP earned: {}",
                        session.getId(), user.getEmail(), durationSeconds, xpEarned);
            } catch (Exception e) {
                log.error("Failed to auto-close session {}", session.getId(), e);
            }
        }
    }
}
