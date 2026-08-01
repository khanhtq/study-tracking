package com.studytracker.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

@Getter
public class XpEarnedEvent extends ApplicationEvent {

    private final UUID userId;
    private final int xpEarned;
    private final long newTotalXp;

    public XpEarnedEvent(Object source, UUID userId, int xpEarned, long newTotalXp) {
        super(source);
        this.userId = userId;
        this.xpEarned = xpEarned;
        this.newTotalXp = newTotalXp;
    }
}
