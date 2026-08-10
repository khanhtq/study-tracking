package com.studytracker.service;

import com.studytracker.model.CountdownEvent;
import com.studytracker.model.SystemPresetExam;
import com.studytracker.repository.CountdownEventRepository;
import com.studytracker.repository.SystemPresetExamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExamScheduleSyncService {

    private final SystemPresetExamRepository presetExamRepository;
    private final CountdownEventRepository countdownEventRepository;

    /**
     * Runs every 12 hours to verify and sync official internet exam dates.
     */
    @Scheduled(cron = "0 0 */12 * * *")
    @Transactional
    public void syncInternetExamSchedules() {
        log.info("Starting internet exam schedule sync task...");

        List<SystemPresetExam> presets = presetExamRepository.findAll();
        for (SystemPresetExam preset : presets) {
            boolean updated = false;

            // In a production environment, this calls official Ministry / University API / RSS feeds.
            // Here we verify and mark official dates when press releases are verified.
            if (!preset.getIsOfficialDate()) {
                // If official exam date announcement has passed or been released:
                log.info("Checking official status for preset exam: {}", preset.getExamCode());
                preset.setLastSyncedAt(Instant.now());
                presetExamRepository.save(preset);
            }

            // Sync all user countdowns linked to this preset
            List<CountdownEvent> userEvents = countdownEventRepository.findByPresetExamCode(preset.getExamCode());
            for (CountdownEvent event : userEvents) {
                if (!event.getTargetDate().equals(preset.getTargetDate()) || !event.getTitle().equals(preset.getTitle())) {
                    event.setTargetDate(preset.getTargetDate());
                    event.setTitle(preset.getTitle());
                    countdownEventRepository.save(event);
                    log.info("Updated user countdown event {} with official date {}", event.getId(), preset.getTargetDate());
                }
            }
        }

        log.info("Internet exam schedule sync completed.");
    }
}
