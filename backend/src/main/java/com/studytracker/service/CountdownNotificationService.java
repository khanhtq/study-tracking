package com.studytracker.service;

import com.studytracker.model.CountdownEvent;
import com.studytracker.repository.CountdownEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class CountdownNotificationService {

    private final CountdownEventRepository countdownEventRepository;
    private final EmailService emailService;

    private static final Set<Long> MILESTONE_DAYS = Set.of(30L, 14L, 7L, 3L, 1L);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    /**
     * Daily check at 8:00 AM for countdown milestone email reminders.
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional(readOnly = true)
    public void sendMilestoneReminders() {
        log.info("Running daily countdown milestone email reminder check...");

        List<CountdownEvent> events = countdownEventRepository.findByEmailNotifyTrue();
        Instant now = Instant.now();

        for (CountdownEvent event : events) {
            if (event.getUser() == null || event.getUser().getEmail() == null) {
                continue;
            }

            long daysRemaining = Duration.between(now, event.getTargetDate()).toDays();

            if (MILESTONE_DAYS.contains(daysRemaining)) {
                String targetDateStr = DATE_FORMATTER.format(event.getTargetDate());
                emailService.sendCountdownReminderEmail(
                        event.getUser().getEmail(),
                        event.getTitle(),
                        daysRemaining,
                        targetDateStr
                );
            }
        }
    }
}
