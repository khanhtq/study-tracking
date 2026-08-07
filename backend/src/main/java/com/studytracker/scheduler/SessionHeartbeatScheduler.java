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

    /**
     * Tự động quét và chốt các session quá 12 giờ chưa kết thúc (quên tắt qua đêm).
     * Chạy định kỳ mỗi 15 phút.
     */
    @Scheduled(fixedRate = 900000) // 15 minutes
    @Transactional
    public void cleanupInactiveSessions() {
        Instant cutoff = Instant.now().minusSeconds(MAX_DURATION_SECONDS);

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
                Instant endTimestamp = session.getStartedAt().plusSeconds(MAX_DURATION_SECONDS);
                int durationSeconds = MAX_DURATION_SECONDS;

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
