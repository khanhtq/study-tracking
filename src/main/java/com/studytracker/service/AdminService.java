package com.studytracker.service;

import com.studytracker.dto.AdminOverviewStatsResponse;
import com.studytracker.dto.OnlineUserResponse;
import com.studytracker.dto.SuspiciousUserAlertDto;
import com.studytracker.dto.UserSessionStatsDto;
import com.studytracker.model.Role;
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
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final StudySessionRepository studySessionRepository;
    private final LeaderboardService leaderboardService;
    private final VirtualUserService virtualUserService;

    @Transactional(readOnly = true)
    public AdminOverviewStatsResponse getOverviewStats() {
        List<User> allUsers = userRepository.findAll();
        List<User> realUsers = allUsers.stream()
                .filter(u -> u.getRole() != Role.ROLE_ADMIN && (u.getIsVirtual() == null || !u.getIsVirtual()))
                .collect(Collectors.toList());

        long totalUsers = realUsers.size();
        Instant activeThreshold = Instant.now().minus(Duration.ofMinutes(2));
        List<User> activeUsers = userRepository.findByLastActiveAtAfter(activeThreshold);

        List<OnlineUserResponse> onlineList = getOnlineUsersDetailed();
        long onlineCount = onlineList.size();
        long studyingCount = onlineList.stream().filter(u -> Boolean.TRUE.equals(u.getIsStudying())).count();

        List<StudySession> allSessions = studySessionRepository.findAll();
        long completedSessionsCount = allSessions.stream()
                .filter(s -> s.getEndedAt() != null)
                .count();

        long totalSeconds = allSessions.stream()
                .filter(s -> s.getEndedAt() != null && s.getDurationSeconds() != null)
                .mapToLong(StudySession::getDurationSeconds)
                .sum();

        long totalXp = realUsers.stream()
                .mapToLong(u -> u.getTotalXp() != null ? u.getTotalXp() : 0L)
                .sum();

        return AdminOverviewStatsResponse.builder()
                .totalUsers(totalUsers)
                .onlineUsersCount(onlineCount)
                .studyingUsersCount(studyingCount)
                .totalSessions(completedSessionsCount)
                .totalStudySeconds(totalSeconds)
                .totalXpDistributed(totalXp)
                .build();
    }

    @Transactional(readOnly = true)
    public List<OnlineUserResponse> getOnlineUsersDetailed() {
        Instant activeThreshold = Instant.now().minus(Duration.ofMinutes(2));
        List<User> activeUsers = userRepository.findByLastActiveAtAfter(activeThreshold).stream()
                .filter(u -> u.getRole() != Role.ROLE_ADMIN && (u.getIsVirtual() == null || !u.getIsVirtual()))
                .collect(Collectors.toList());

        List<OnlineUserResponse> realResponses = activeUsers.stream().map(u -> {
            Optional<StudySession> activeSessionOpt = studySessionRepository.findByUserAndEndedAtIsNull(u);
            boolean isStudying = activeSessionOpt.isPresent();
            String currentSubject = isStudying ? activeSessionOpt.get().getSubject() : null;
            Instant studyStartedAt = isStudying ? activeSessionOpt.get().getStartedAt() : null;

            return OnlineUserResponse.builder()
                    .userId(u.getId())
                    .displayName(u.getDisplayName() != null ? u.getDisplayName() : u.getEmail())
                    .lastActiveAt(u.getLastActiveAt())
                    .isStudying(isStudying)
                    .currentSubject(currentSubject)
                    .studyStartedAt(studyStartedAt)
                    .currentLevel(u.getCurrentLevel())
                    .currentXp(u.getCurrentXp())
                    .isVirtual(false)
                    .build();
        }).collect(Collectors.toList());

        List<OnlineUserResponse> result = new ArrayList<>(realResponses);
        result.addAll(virtualUserService.getVirtualOnlineResponses());
        return result;
    }

    @Transactional(readOnly = true)
    public List<UserSessionStatsDto> getUserStatsList(String range) {
        Instant periodCutoff = calculatePeriodCutoff(range);
        Instant onlineThreshold = Instant.now().minus(Duration.ofMinutes(2));
        Instant cutoff24h = Instant.now().minus(24, ChronoUnit.HOURS);

        List<User> allUsers = userRepository.findAll().stream()
                .filter(u -> u.getRole() != Role.ROLE_ADMIN && (u.getIsVirtual() == null || !u.getIsVirtual()))
                .collect(Collectors.toList());

        List<StudySession> allSessions = studySessionRepository.findAll();
        Map<UUID, List<StudySession>> sessionsByUserMap = allSessions.stream()
                .filter(s -> s.getUser() != null)
                .collect(Collectors.groupingBy(s -> s.getUser().getId()));

        return allUsers.stream().map(user -> {
            boolean isOnline = user.getLastActiveAt() != null && user.getLastActiveAt().isAfter(onlineThreshold);
            List<StudySession> userSessions = sessionsByUserMap.getOrDefault(user.getId(), Collections.emptyList());
            userSessions.sort(Comparator.comparing(StudySession::getStartedAt, Comparator.nullsLast(Comparator.reverseOrder())));

            boolean isStudying = isOnline && userSessions.stream().anyMatch(s -> s.getEndedAt() == null);

            long totalSessionsCount = userSessions.stream().filter(s -> s.getEndedAt() != null).count();
            long totalStudySeconds = userSessions.stream()
                    .filter(s -> s.getEndedAt() != null && s.getDurationSeconds() != null)
                    .mapToLong(StudySession::getDurationSeconds)
                    .sum();

            List<StudySession> periodSessions = userSessions.stream()
                    .filter(s -> s.getStartedAt() != null && (periodCutoff == null || s.getStartedAt().isAfter(periodCutoff)))
                    .collect(Collectors.toList());

            long periodSessionsCount = periodSessions.stream().filter(s -> s.getEndedAt() != null).count();
            long periodStudySeconds = periodSessions.stream()
                    .filter(s -> s.getEndedAt() != null && s.getDurationSeconds() != null)
                    .mapToLong(StudySession::getDurationSeconds)
                    .sum();
            long periodXpEarned = periodSessions.stream()
                    .filter(s -> s.getEndedAt() != null && s.getXpEarned() != null)
                    .mapToLong(StudySession::getXpEarned)
                    .sum();

            Optional<SuspiciousUserAlertDto> alertOpt = evaluateUserSuspiciousActivity(user, userSessions, cutoff24h);
            boolean isSuspicious = alertOpt.isPresent();
            List<String> suspiciousReasons = alertOpt.map(SuspiciousUserAlertDto::getReasons).orElse(null);

            return UserSessionStatsDto.builder()
                    .userId(user.getId())
                    .displayName(user.getDisplayName() != null ? user.getDisplayName() : "User")
                    .email(user.getEmail())
                    .role(user.getRole() != null ? user.getRole().name() : "ROLE_USER")
                    .currentLevel(user.getCurrentLevel() != null ? user.getCurrentLevel() : 1)
                    .totalXp(user.getTotalXp() != null ? user.getTotalXp() : 0L)
                    .isOnline(isOnline)
                    .isStudying(isStudying)
                    .lastActiveAt(user.getLastActiveAt())
                    .totalSessionsCount(totalSessionsCount)
                    .totalStudySeconds(totalStudySeconds)
                    .periodSessionsCount(periodSessionsCount)
                    .periodStudySeconds(periodStudySeconds)
                    .periodXpEarned(periodXpEarned)
                    .isSuspicious(isSuspicious)
                    .suspiciousReasons(suspiciousReasons)
                    .isBanned(Boolean.TRUE.equals(user.getBanned()))
                    .banReason(user.getBanReason())
                    .bannedAt(user.getBannedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SuspiciousUserAlertDto> getSuspiciousUsers() {
        List<User> allUsers = userRepository.findAll().stream()
                .filter(u -> u.getRole() != Role.ROLE_ADMIN && (u.getIsVirtual() == null || !u.getIsVirtual()))
                .collect(Collectors.toList());
        Instant cutoff24h = Instant.now().minus(24, ChronoUnit.HOURS);

        List<StudySession> allSessions = studySessionRepository.findAll();
        Map<UUID, List<StudySession>> sessionsByUserMap = allSessions.stream()
                .filter(s -> s.getUser() != null)
                .collect(Collectors.groupingBy(s -> s.getUser().getId()));

        List<SuspiciousUserAlertDto> suspiciousAlerts = new ArrayList<>();

        for (User user : allUsers) {
            List<StudySession> userSessions = sessionsByUserMap.getOrDefault(user.getId(), Collections.emptyList());
            Optional<SuspiciousUserAlertDto> alertOpt = evaluateUserSuspiciousActivity(user, userSessions, cutoff24h);
            alertOpt.ifPresent(suspiciousAlerts::add);
        }

        suspiciousAlerts.sort(Comparator.comparingInt(this::getSeverityWeight));
        return suspiciousAlerts;
    }

    private Optional<SuspiciousUserAlertDto> evaluateUserSuspiciousActivity(User user, List<StudySession> userSessions, Instant cutoff24h) {
        List<StudySession> recentSessions = userSessions.stream()
                .filter(s -> s.getStartedAt() != null && s.getStartedAt().isAfter(cutoff24h))
                .collect(Collectors.toList());

        long totalStudySeconds24h = recentSessions.stream()
                .filter(s -> s.getEndedAt() != null && s.getDurationSeconds() != null)
                .mapToLong(StudySession::getDurationSeconds)
                .sum();

        long manualSessionsCount24h = recentSessions.stream()
                .filter(s -> s.getEndedAt() != null && s.getSource() == SessionSource.MANUAL)
                .count();

        long manualStudySeconds24h = recentSessions.stream()
                .filter(s -> s.getEndedAt() != null && s.getSource() == SessionSource.MANUAL && s.getDurationSeconds() != null)
                .mapToLong(StudySession::getDurationSeconds)
                .sum();

        long totalSessionsCount24h = recentSessions.stream()
                .filter(s -> s.getEndedAt() != null)
                .count();

        long xpEarned24h = recentSessions.stream()
                .filter(s -> s.getEndedAt() != null && s.getXpEarned() != null)
                .mapToLong(StudySession::getXpEarned)
                .sum();

        List<String> reasons = new ArrayList<>();
        String severity = null;

        // Rule 1: Exceeds 16 hours of study in 24h
        if (totalStudySeconds24h > 57600) {
            double hours = Math.round((totalStudySeconds24h / 3600.0) * 10.0) / 10.0;
            reasons.add(String.format("Studied %.1f hours in the last 24 hours (exceeds 16h limit)", hours));
            severity = "HIGH";
        }

        // Rule 2: Excessive XP gain (> 10,000 XP in 24h)
        if (xpEarned24h > 10000) {
            reasons.add(String.format("Earned %d XP in the last 24 hours (excessive XP spike)", xpEarned24h));
            if (!"HIGH".equals(severity)) {
                severity = "HIGH";
            }
        }

        // Rule 3: Frequent or excessive manual sessions (> 4 manual sessions or > 8h manual study)
        if (manualSessionsCount24h > 4 || manualStudySeconds24h > 28800) {
            double manualHours = Math.round((manualStudySeconds24h / 3600.0) * 10.0) / 10.0;
            reasons.add(String.format("Created %d manual sessions (%.1f hours) in the last 24 hours", manualSessionsCount24h, manualHours));
            if (severity == null) {
                severity = "MEDIUM";
            }
        }

        // Rule 4: High total session volume (> 10 sessions in 24h)
        if (totalSessionsCount24h > 10) {
            reasons.add(String.format("Created %d sessions in the last 24 hours", totalSessionsCount24h));
            if (severity == null) {
                severity = "WARNING";
            }
        }

        if (reasons.isEmpty()) {
            return Optional.empty();
        }

        return Optional.of(SuspiciousUserAlertDto.builder()
                .userId(user.getId())
                .displayName(user.getDisplayName() != null ? user.getDisplayName() : user.getEmail())
                .email(user.getEmail())
                .currentLevel(user.getCurrentLevel() != null ? user.getCurrentLevel() : 1)
                .totalXp(user.getTotalXp() != null ? user.getTotalXp() : 0L)
                .severity(severity)
                .reasons(reasons)
                .totalStudySeconds24h(totalStudySeconds24h)
                .manualSessionsCount24h(manualSessionsCount24h)
                .xpEarned24h(xpEarned24h)
                .lastActiveAt(user.getLastActiveAt())
                .isBanned(Boolean.TRUE.equals(user.getBanned()))
                .banReason(user.getBanReason())
                .build());
    }

    @Transactional
    public void banUser(UUID userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        if (user.getRole() == com.studytracker.model.Role.ROLE_ADMIN) {
            throw new IllegalArgumentException("Cannot ban an administrator account");
        }

        user.setBanned(true);
        user.setBanReason(reason != null && !reason.isBlank() ? reason.trim() : "Violated community guidelines");
        user.setBannedAt(Instant.now());
        userRepository.save(user);
    }

    @Transactional
    public void unbanUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        user.setBanned(false);
        user.setBanReason(null);
        user.setBannedAt(null);
        userRepository.save(user);
    }

    @Transactional
    public void resetUserProgress(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        if (user.getRole() == com.studytracker.model.Role.ROLE_ADMIN) {
            throw new IllegalArgumentException("Cannot reset progress of an administrator account");
        }

        // Delete all study sessions belonging to the user
        studySessionRepository.deleteByUser(user);

        // Reset level, current XP and total XP to 0
        user.setCurrentLevel(1);
        user.setCurrentXp(0);
        user.setTotalXp(0L);
        userRepository.save(user);

        // Update Redis Leaderboard ZSET
        leaderboardService.updateUserXpInRedis(user.getId(), 0L);
    }

    private int getSeverityWeight(SuspiciousUserAlertDto alert) {
        if ("HIGH".equals(alert.getSeverity())) return 1;
        if ("MEDIUM".equals(alert.getSeverity())) return 2;
        return 3;
    }

    @Transactional(readOnly = true)
    public List<StudySession> getUserSessions(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        return studySessionRepository.findByUserOrderByStartedAtDesc(user);
    }

    private Instant calculatePeriodCutoff(String range) {
        if (range == null) return null;
        Instant now = Instant.now();
        switch (range.toLowerCase()) {
            case "today":
                return ZonedDateTime.now(ZoneId.systemDefault()).truncatedTo(ChronoUnit.DAYS).toInstant();
            case "7d":
                return now.minus(7, ChronoUnit.DAYS);
            case "30d":
                return now.minus(30, ChronoUnit.DAYS);
            case "all":
            default:
                return null;
        }
    }
}
