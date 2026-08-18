package com.studytracker.scheduler;

import com.studytracker.service.GroupCountdownService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class GroupCountdownDailyScheduler {

    private final GroupCountdownService groupCountdownService;

    /**
     * Tự động phát bản tin đếm ngược vào 7:00 sáng mỗi ngày (Giờ Việt Nam).
     */
    @Scheduled(cron = "0 0 7 * * *", zone = "Asia/Ho_Chi_Minh")
    public void sendDailyGroupCountdownBroadcast() {
        try {
            log.info("Bắt đầu chạy tác vụ tự động phát bản tin đếm ngược nhóm học tập...");
            groupCountdownService.processDailyCountdownBroadcast();
        } catch (Exception e) {
            log.error("Lỗi khi phát bản tin đếm ngược nhóm học tập hàng ngày", e);
        }
    }
}
