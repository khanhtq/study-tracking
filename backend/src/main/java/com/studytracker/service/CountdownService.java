package com.studytracker.service;

import com.studytracker.dto.CountdownDto;
import com.studytracker.dto.CreateCountdownRequest;
import com.studytracker.dto.SystemPresetExamDto;
import com.studytracker.model.CountdownEvent;
import com.studytracker.model.SystemPresetExam;
import com.studytracker.model.User;
import com.studytracker.repository.CountdownEventRepository;
import com.studytracker.repository.SystemPresetExamRepository;
import com.studytracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CountdownService {

    private final CountdownEventRepository countdownEventRepository;
    private final SystemPresetExamRepository presetExamRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SystemPresetExamDto> getAllPresets(String search) {
        Instant now = Instant.now();
        List<SystemPresetExam> list;
        if (search != null && !search.trim().isEmpty()) {
            list = presetExamRepository.searchActivePresets(search.trim(), now);
        } else {
            list = presetExamRepository.findActivePresets(now);
        }
        return list.stream()
                .map(this::toPresetDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CountdownDto> getUserCountdowns(UUID userId) {
        Instant now = Instant.now();
        return countdownEventRepository.findByUserIdAndTargetDateAfterOrderByTargetDateAsc(userId, now).stream()
                .map(this::toCountdownDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public CountdownDto createCountdown(UUID userId, CreateCountdownRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        if (Boolean.TRUE.equals(request.getIsPinned())) {
            countdownEventRepository.unpinAllForUser(userId);
        }

        String presetCode = request.getPresetExamCode();

        // If user is already tracking this preset, update pin status & info
        if (presetCode != null && !presetCode.isBlank()) {
            Optional<CountdownEvent> existingOpt = countdownEventRepository.findByUserIdAndPresetExamCode(userId, presetCode);
            if (existingOpt.isPresent()) {
                CountdownEvent existing = existingOpt.get();
                if (request.getTargetDate() != null) existing.setTargetDate(request.getTargetDate());
                if (request.getNote() != null) existing.setNote(request.getNote());
                if (request.getTitle() != null && !request.getTitle().isBlank()) existing.setTitle(request.getTitle());
                if (request.getCategory() != null) existing.setCategory(request.getCategory());
                if (request.getColor() != null) existing.setColor(request.getColor());
                if (request.getIsPinned() != null) existing.setIsPinned(request.getIsPinned());
                if (request.getEmailNotify() != null) existing.setEmailNotify(request.getEmailNotify());
                CountdownEvent updated = countdownEventRepository.saveAndFlush(existing);
                return toCountdownDto(updated);
            }
        }

        // If preset code is provided, verify it exists in DB to prevent foreign key constraint violations
        if (presetCode != null && !presetCode.isBlank()) {
            Optional<SystemPresetExam> presetOpt = presetExamRepository.findByExamCode(presetCode);
            if (presetOpt.isEmpty()) {
                // Ensure foreign key target exists
                SystemPresetExam autoCreatedPreset = SystemPresetExam.builder()
                        .examCode(presetCode)
                        .title(request.getTitle())
                        .category(request.getCategory() != null ? request.getCategory() : "exam")
                        .targetDate(request.getTargetDate())
                        .isOfficialDate(false)
                        .description(request.getNote())
                        .color(request.getColor() != null ? request.getColor() : "indigo")
                        .createdByUser(user)
                        .isCommunityEvent(Boolean.TRUE.equals(request.getIsCommunityEvent()))
                        .trackerCount(1)
                        .build();
                presetExamRepository.saveAndFlush(autoCreatedPreset);
            } else {
                presetExamRepository.incrementTrackerCount(presetCode);
            }
        } else if (Boolean.TRUE.equals(request.getIsCommunityEvent())) {
            // If user wants to share this custom countdown with the community
            presetCode = "COMMUNITY_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            SystemPresetExam communityExam = SystemPresetExam.builder()
                    .examCode(presetCode)
                    .title(request.getTitle())
                    .category(request.getCategory() != null ? request.getCategory() : "event")
                    .targetDate(request.getTargetDate())
                    .isOfficialDate(false)
                    .description(request.getNote())
                    .color(request.getColor() != null ? request.getColor() : "indigo")
                    .createdByUser(user)
                    .isCommunityEvent(true)
                    .trackerCount(1)
                    .build();

            presetExamRepository.saveAndFlush(communityExam);
        }

        CountdownEvent event = CountdownEvent.builder()
                .user(user)
                .presetExamCode(presetCode)
                .title(request.getTitle())
                .targetDate(request.getTargetDate())
                .category(request.getCategory() != null ? request.getCategory() : "custom")
                .color(request.getColor() != null ? request.getColor() : "indigo")
                .icon(request.getIcon() != null ? request.getIcon() : "calendar")
                .note(request.getNote())
                .isPinned(request.getIsPinned() != null ? request.getIsPinned() : false)
                .emailNotify(request.getEmailNotify() != null ? request.getEmailNotify() : true)
                .build();

        // If linked to preset and title/targetDate was empty, inherit from preset
        if (presetCode != null && !presetCode.isBlank()) {
            presetExamRepository.findByExamCode(presetCode).ifPresent(preset -> {
                if (event.getTargetDate() == null) {
                    event.setTargetDate(preset.getTargetDate());
                }
                if (event.getTitle() == null || event.getTitle().isBlank()) {
                    event.setTitle(preset.getTitle());
                }
            });
        }

        CountdownEvent saved = countdownEventRepository.saveAndFlush(event);
        log.info("Successfully created countdown event [{}] for user [{}]", saved.getId(), userId);
        return toCountdownDto(saved);
    }

    @Transactional
    public CountdownDto updateCountdown(UUID userId, String identifier, CreateCountdownRequest request) {
        CountdownEvent event = findEventByIdentifier(userId, identifier)
                .orElseThrow(() -> new IllegalArgumentException("Countdown event not found: " + identifier));

        if (!event.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Unauthorized to edit this countdown");
        }

        if (Boolean.TRUE.equals(request.getIsPinned()) && !Boolean.TRUE.equals(event.getIsPinned())) {
            countdownEventRepository.unpinAllForUser(userId);
        }

        if (request.getTitle() != null && !request.getTitle().isBlank()) event.setTitle(request.getTitle());
        if (request.getTargetDate() != null) event.setTargetDate(request.getTargetDate());
        if (request.getCategory() != null) event.setCategory(request.getCategory());
        if (request.getColor() != null) event.setColor(request.getColor());
        if (request.getIcon() != null) event.setIcon(request.getIcon());
        if (request.getNote() != null) event.setNote(request.getNote());
        if (request.getIsPinned() != null) event.setIsPinned(request.getIsPinned());
        if (request.getEmailNotify() != null) event.setEmailNotify(request.getEmailNotify());

        CountdownEvent updated = countdownEventRepository.saveAndFlush(event);
        return toCountdownDto(updated);
    }

    @Transactional
    public CountdownDto pinCountdown(UUID userId, String identifier) {
        CountdownEvent event = findEventByIdentifier(userId, identifier)
                .orElseThrow(() -> new IllegalArgumentException("Countdown event not found: " + identifier));

        if (!event.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Unauthorized to edit this countdown");
        }

        countdownEventRepository.unpinAllForUser(userId);
        event.setIsPinned(true);
        CountdownEvent updated = countdownEventRepository.saveAndFlush(event);
        log.info("Pinned countdown event [{}] for user [{}]", updated.getId(), userId);
        return toCountdownDto(updated);
    }

    @Transactional
    public void deleteCountdown(UUID userId, String identifier) {
        Optional<CountdownEvent> eventOpt = findEventByIdentifier(userId, identifier);
        if (eventOpt.isEmpty()) {
            log.warn("Countdown event [{}] not found for delete, skipping.", identifier);
            return;
        }

        CountdownEvent event = eventOpt.get();
        if (!event.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Unauthorized to delete this countdown");
        }

        String presetCode = event.getPresetExamCode();

        // Check if this is a community event created by THIS user (chính chủ xóa)
        if (presetCode != null && !presetCode.isBlank()) {
            Optional<SystemPresetExam> presetOpt = presetExamRepository.findByExamCode(presetCode);
            if (presetOpt.isPresent()) {
                SystemPresetExam preset = presetOpt.get();
                boolean isOwner = preset.getCreatedByUser() != null && preset.getCreatedByUser().getId().equals(userId);
                if (isOwner) {
                    boolean isNotExpired = preset.getTargetDate() != null && preset.getTargetDate().isAfter(Instant.now());
                    long liveTrackerCount = countdownEventRepository.countByPresetExamCode(presetCode);
                    int storedCount = preset.getTrackerCount() != null ? preset.getTrackerCount() : 0;
                    long totalTrackers = Math.max(liveTrackerCount, storedCount);

                    // Điều kiện: Nếu sự kiện chưa kết thúc mà vẫn còn người khác đang theo dõi (> 1 người), không thể xóa
                    if (isNotExpired && totalTrackers > 1) {
                        long otherTrackers = totalTrackers - 1;
                        throw new IllegalStateException("Không thể xóa sự kiện khi sự kiện chưa kết thúc và vẫn còn " + otherTrackers + " người đang theo dõi.");
                    }

                    log.info("Creator [{}] deleted community preset [{}] as no other users are tracking it or it has expired.", userId, presetCode);
                    countdownEventRepository.deleteByPresetExamCode(presetCode);
                    presetExamRepository.delete(preset);
                    return;
                } else {
                    // Regular tracker untracking the event
                    presetExamRepository.decrementTrackerCount(presetCode);
                }
            }
        }

        countdownEventRepository.delete(event);
        log.info("Deleted countdown event [{}] for user [{}]", event.getId(), userId);
    }

    /**
     * Daily auto-cleanup for expired countdown events and community presets (older than 1 day).
     */
    @Scheduled(cron = "0 0 2 * * *") // Daily at 2:00 AM
    @Transactional
    public void cleanupExpiredCountdowns() {
        Instant threshold = Instant.now().minusSeconds(86400); // 1 day past target date
        int deletedEvents = countdownEventRepository.deleteExpiredEvents(threshold);
        int deletedPresets = presetExamRepository.deleteExpiredCommunityPresets(threshold);
        if (deletedEvents > 0 || deletedPresets > 0) {
            log.info("Cleaned up expired countdowns: [{}] events and [{}] community presets deleted.", deletedEvents, deletedPresets);
        }
    }

    private Optional<CountdownEvent> findEventByIdentifier(UUID userId, String identifier) {
        if (identifier == null || identifier.isBlank()) return Optional.empty();

        // 1. Try finding by UUID
        try {
            UUID id = UUID.fromString(identifier);
            Optional<CountdownEvent> byId = countdownEventRepository.findById(id);
            if (byId.isPresent()) return byId;
        } catch (IllegalArgumentException ignored) {
            // Identifier is not a standard UUID string
        }

        // 2. Try finding by preset exam code
        String cleanCode = identifier.startsWith("preset_") ? identifier.replace("preset_", "") : identifier;
        Optional<CountdownEvent> byPreset = countdownEventRepository.findByUserIdAndPresetExamCode(userId, identifier);
        if (byPreset.isPresent()) return byPreset;

        return countdownEventRepository.findByUserIdAndPresetExamCode(userId, cleanCode);
    }

    private SystemPresetExamDto toPresetDto(SystemPresetExam preset) {
        String createdByUserId = preset.getCreatedByUser() != null ? preset.getCreatedByUser().getId().toString() : null;
        String creatorDisplayName = preset.getCreatedByUser() != null ? preset.getCreatedByUser().getDisplayName() : null;

        long liveCount = countdownEventRepository.countByPresetExamCode(preset.getExamCode());
        int storedCount = preset.getTrackerCount() != null ? preset.getTrackerCount() : 0;
        int trackerCount = (int) Math.max(liveCount, storedCount);

        return SystemPresetExamDto.builder()
                .examCode(preset.getExamCode())
                .title(preset.getTitle())
                .category(preset.getCategory())
                .targetDate(preset.getTargetDate())
                .isOfficialDate(preset.getIsOfficialDate())
                .sourceUrl(preset.getSourceUrl())
                .description(preset.getDescription())
                .color(preset.getColor())
                .trackerCount(trackerCount)
                .createdByUserId(createdByUserId)
                .creatorDisplayName(creatorDisplayName)
                .isCommunityEvent(preset.getIsCommunityEvent())
                .lastSyncedAt(preset.getLastSyncedAt())
                .build();
    }

    private CountdownDto toCountdownDto(CountdownEvent event) {
        Boolean isOfficial = false;
        String sourceUrl = null;
        Integer trackerCount = 0;

        if (event.getPresetExamCode() != null && !event.getPresetExamCode().isBlank()) {
            long liveCount = countdownEventRepository.countByPresetExamCode(event.getPresetExamCode());
            Optional<SystemPresetExam> presetOpt = presetExamRepository.findByExamCode(event.getPresetExamCode());
            if (presetOpt.isPresent()) {
                SystemPresetExam preset = presetOpt.get();
                isOfficial = preset.getIsOfficialDate();
                sourceUrl = preset.getSourceUrl();
                int storedCount = preset.getTrackerCount() != null ? preset.getTrackerCount() : 0;
                trackerCount = (int) Math.max(liveCount, storedCount);
            } else {
                trackerCount = (int) liveCount;
            }
        }

        return CountdownDto.builder()
                .id(event.getId())
                .presetExamCode(event.getPresetExamCode())
                .title(event.getTitle())
                .targetDate(event.getTargetDate())
                .category(event.getCategory())
                .color(event.getColor())
                .icon(event.getIcon())
                .note(event.getNote())
                .isPinned(event.getIsPinned())
                .emailNotify(event.getEmailNotify())
                .isOfficialDate(isOfficial)
                .sourceUrl(sourceUrl)
                .trackerCount(trackerCount)
                .createdAt(event.getCreatedAt())
                .build();
    }
}
