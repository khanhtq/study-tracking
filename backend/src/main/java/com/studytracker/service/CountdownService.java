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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        List<SystemPresetExam> list;
        if (search != null && !search.trim().isEmpty()) {
            list = presetExamRepository.searchPresets(search.trim());
        } else {
            list = presetExamRepository.findAllByOrderByIsOfficialDateDescTrackerCountDescTargetDateAsc();
        }
        return list.stream()
                .map(this::toPresetDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CountdownDto> getUserCountdowns(UUID userId) {
        return countdownEventRepository.findByUserIdOrderByTargetDateAsc(userId).stream()
                .map(this::toCountdownDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public CountdownDto createCountdown(UUID userId, CreateCountdownRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (Boolean.TRUE.equals(request.getIsPinned())) {
            countdownEventRepository.unpinAllForUser(userId);
        }

        String presetCode = request.getPresetExamCode();

        // If user wants to share this custom countdown with the community
        if (Boolean.TRUE.equals(request.getIsCommunityEvent()) && (presetCode == null || presetCode.isBlank())) {
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

            presetExamRepository.save(communityExam);
        } else if (presetCode != null && !presetCode.isBlank()) {
            presetExamRepository.incrementTrackerCount(presetCode);
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

        // If linked to preset, inherit official date & info
        if (presetCode != null && !presetCode.isBlank()) {
            presetExamRepository.findByExamCode(presetCode)
                    .ifPresent(preset -> {
                        event.setTargetDate(preset.getTargetDate());
                        if (event.getTitle() == null || event.getTitle().isBlank()) {
                            event.setTitle(preset.getTitle());
                        }
                    });
        }

        CountdownEvent saved = countdownEventRepository.save(event);
        return toCountdownDto(saved);
    }

    @Transactional
    public CountdownDto updateCountdown(UUID userId, UUID id, CreateCountdownRequest request) {
        CountdownEvent event = countdownEventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Countdown event not found"));

        if (!event.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Unauthorized to edit this countdown");
        }

        if (Boolean.TRUE.equals(request.getIsPinned()) && !Boolean.TRUE.equals(event.getIsPinned())) {
            countdownEventRepository.unpinAllForUser(userId);
        }

        event.setTitle(request.getTitle());
        event.setTargetDate(request.getTargetDate());
        if (request.getCategory() != null) event.setCategory(request.getCategory());
        if (request.getColor() != null) event.setColor(request.getColor());
        if (request.getIcon() != null) event.setIcon(request.getIcon());
        if (request.getNote() != null) event.setNote(request.getNote());
        if (request.getIsPinned() != null) event.setIsPinned(request.getIsPinned());
        if (request.getEmailNotify() != null) event.setEmailNotify(request.getEmailNotify());

        CountdownEvent updated = countdownEventRepository.save(event);
        return toCountdownDto(updated);
    }

    @Transactional
    public CountdownDto pinCountdown(UUID userId, UUID id) {
        CountdownEvent event = countdownEventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Countdown event not found"));

        if (!event.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Unauthorized to edit this countdown");
        }

        countdownEventRepository.unpinAllForUser(userId);
        event.setIsPinned(true);
        CountdownEvent updated = countdownEventRepository.save(event);
        return toCountdownDto(updated);
    }

    @Transactional
    public void deleteCountdown(UUID userId, UUID id) {
        CountdownEvent event = countdownEventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Countdown event not found"));

        if (!event.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Unauthorized to delete this countdown");
        }

        if (event.getPresetExamCode() != null && !event.getPresetExamCode().isBlank()) {
            presetExamRepository.decrementTrackerCount(event.getPresetExamCode());
        }

        countdownEventRepository.delete(event);
    }

    private SystemPresetExamDto toPresetDto(SystemPresetExam preset) {
        String createdByUserId = preset.getCreatedByUser() != null ? preset.getCreatedByUser().getId().toString() : null;
        String creatorDisplayName = preset.getCreatedByUser() != null ? preset.getCreatedByUser().getDisplayName() : null;

        return SystemPresetExamDto.builder()
                .examCode(preset.getExamCode())
                .title(preset.getTitle())
                .category(preset.getCategory())
                .targetDate(preset.getTargetDate())
                .isOfficialDate(preset.getIsOfficialDate())
                .sourceUrl(preset.getSourceUrl())
                .description(preset.getDescription())
                .color(preset.getColor())
                .trackerCount(preset.getTrackerCount() != null ? preset.getTrackerCount() : 0)
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

        if (event.getPresetExamCode() != null) {
            Optional<SystemPresetExam> presetOpt = presetExamRepository.findByExamCode(event.getPresetExamCode());
            if (presetOpt.isPresent()) {
                SystemPresetExam preset = presetOpt.get();
                isOfficial = preset.getIsOfficialDate();
                sourceUrl = preset.getSourceUrl();
                trackerCount = preset.getTrackerCount();
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
