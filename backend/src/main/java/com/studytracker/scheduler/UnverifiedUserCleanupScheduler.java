package com.studytracker.scheduler;

import com.studytracker.repository.StudySessionRepository;
import com.studytracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class UnverifiedUserCleanupScheduler {

    private final UserRepository userRepository;
    private final StudySessionRepository studySessionRepository;

    /**
     * Tự động quét và xóa các tài khoản chưa kích hoạt (enabled = false)
     * đã quá 5 phút kể từ lúc đăng ký.
     * Chạy định kỳ 30 giây 1 lần.
     */
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void cleanupUnverifiedUsers() {
        Instant threshold = Instant.now().minus(5, ChronoUnit.MINUTES);
        try {
            studySessionRepository.deleteByUnverifiedUsers(threshold);
            userRepository.deleteByEnabledFalseAndCreatedAtBefore(threshold);
        } catch (Exception e) {
            log.error("Error occurred while cleaning up unverified user accounts: {}", e.getMessage());
        }
    }
}
