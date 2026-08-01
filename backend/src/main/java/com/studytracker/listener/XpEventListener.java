package com.studytracker.listener;

import com.studytracker.event.XpEarnedEvent;
import com.studytracker.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class XpEventListener {

    private final LeaderboardService leaderboardService;

    @Async
    @EventListener
    public void handleXpEarned(XpEarnedEvent event) {
        log.info("Handling XpEarnedEvent asynchronously for userId: {}, xpEarned: {}, newTotalXp: {}",
                event.getUserId(), event.getXpEarned(), event.getNewTotalXp());
        leaderboardService.updateUserXpInRedis(event.getUserId(), event.getNewTotalXp());
    }
}
