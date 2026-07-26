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
     * Bắt đầu một session học tập mới (Timer mode).
     */
    /**
     * Bắt đầu một session học tập mới (Timer mode).
     */
    @Transactional
    public StudySessionResponse startSession(User user, SessionStartRequest request) {
        String subject = request != null ? request.getSubject() : null;
        String studyMethod = (request != null && request.getStudyMethod() != null && !request.getStudyMethod().isBlank())
                ? request.getStudyMethod() : "FREE_MODE";
        Integer targetDurationSeconds = request != null ? request.getTargetDurationSeconds() : null;

        // Kiểm tra xem user có session nào chưa kết thúc không
        Optional<StudySession> activeSessionOpt = studySessionRepository.findByUserAndEndedAtIsNull(user);
        if (activeSessionOpt.isPresent()) {
            // Nếu có session đang chạy, trả về session đó
            return mapToResponse(activeSessionOpt.get());
        }

        Instant now = Instant.now();

        // Chống trùng lặp thời gian với các session thủ công đã ghi nhận
        if (studySessionRepository.existsOverlappingSession(user, now, now.plusSeconds(1), null)) {
            throw new IllegalArgumentException("Không thể bắt đầu session mới do trùng với khoảng thời gian của một phiên học khác");
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
     * Overload để tương thích ngược nếu gọi chỉ với subject.
     */
    @Transactional
    public StudySessionResponse startSession(User user, String subject) {
        SessionStartRequest req = new SessionStartRequest();
        req.setSubject(subject);
        return startSession(user, req);
    }

    /**
     * Gửi heartbeat để cập nhật thời gian hoạt động gần nhất của session.
     */
    @Transactional
    public void heartbeat(User user, UUID sessionId) {
        StudySession session = studySessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with id: " + sessionId));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Session does not belong to this user");
        }

        if (session.getEndedAt() != null) {
            return; // Session đã kết thúc, bỏ qua heartbeat
        }

        session.setLastHeartbeatAt(Instant.now());
        studySessionRepository.save(session);
    }

    /**
     * Kết thúc session học tập đang chạy.
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

        // Anti-Cheat: Nếu quá 2 phút (120s) không có heartbeat, chốt endedAt = lastHeartbeatAt để tránh treo máy
        Instant lastActiveTime = session.getLastHeartbeatAt() != null ? session.getLastHeartbeatAt() : session.getStartedAt();
        if (Duration.between(lastActiveTime, endedAt).getSeconds() > 120) {
            endedAt = lastActiveTime;
        }

        int durationSeconds = (int) Duration.between(session.getStartedAt(), endedAt).toSeconds();
        
        // Chống treo máy qua đêm (giới hạn tối đa 12h)
        if (durationSeconds > MAX_DURATION_SECONDS) {
            durationSeconds = MAX_DURATION_SECONDS;
            endedAt = session.getStartedAt().plusSeconds(MAX_DURATION_SECONDS);
        }
        
        if (durationSeconds < 1) {
            durationSeconds = 1; // Tối thiểu 1 giây
        }

        int baseXp = xpService.calculateXpEarned(durationSeconds);
        boolean isCompleted = false;
        int finalXp = baseXp;

        // Thưởng 15% Bonus XP nếu người dùng học đủ thời gian preset
        if (session.getTargetDurationSeconds() != null && session.getTargetDurationSeconds() > 0) {
            if (durationSeconds >= (session.getTargetDurationSeconds() - 5)) {
                isCompleted = true;
                finalXp = (int) Math.round(baseXp * 1.15);
            }
        }
        
        // Cộng XP và cập nhật level của user
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
     * Nhập thủ công một session đã học.
     */
    @Transactional
    public StudySessionResponse createManualSession(User user, SessionManualRequest request) {
        Instant startedAt = request.getStartedAt();
        int durationSeconds = request.getDurationSeconds();
        
        if (startedAt == null) {
            throw new IllegalArgumentException("Thời gian bắt đầu không được để trống");
        }

        if (durationSeconds < 1) {
            throw new IllegalArgumentException("Thời lượng phiên học phải từ 1 giây trở lên");
        }

        if (durationSeconds > MAX_DURATION_SECONDS) {
            throw new IllegalArgumentException("Thời lượng phiên học thủ công không được vượt quá 12 giờ");
        }

        Instant endedAt = startedAt.plusSeconds(durationSeconds);
        Instant nowWithTolerance = Instant.now().plusSeconds(60); // 60s clock skew tolerance

        if (startedAt.isAfter(nowWithTolerance)) {
            throw new IllegalArgumentException("Thời gian bắt đầu học không thể nằm ở tương lai");
        }

        if (endedAt.isAfter(nowWithTolerance)) {
            throw new IllegalArgumentException("Thời gian kết thúc phiên học không thể nằm ở tương lai");
        }

        // Anti-Cheat: Kiểm tra trùng lặp khoảng thời gian [startedAt, endedAt] với các session khác của user
        if (studySessionRepository.existsOverlappingSession(user, startedAt, endedAt, null)) {
            throw new IllegalArgumentException("Khoảng thời gian học này bị trùng lặp với một phiên học khác");
        }

        int xpEarned = xpService.calculateXpEarned(durationSeconds);

        // Cộng XP và cập nhật level cho user
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
     * Lấy session đang hoạt động (nếu có).
     */
    public Optional<StudySessionResponse> getActiveSession(User user) {
        return studySessionRepository.findByUserAndEndedAtIsNull(user)
                .map(this::mapToResponse);
    }

    /**
     * Lấy lịch sử session học tập của user.
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
