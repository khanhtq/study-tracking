package com.studytracker.service;

import com.studytracker.model.User;
import com.studytracker.model.XpLevelConfig;
import com.studytracker.repository.XpLevelConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.springframework.context.ApplicationEventPublisher;

@ExtendWith(MockitoExtension.class)
public class XpServiceTest {

    @Mock
    private XpLevelConfigRepository xpLevelConfigRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private PaymentService paymentService;

    @InjectMocks
    private XpService xpService;

    @BeforeEach
    void setUp() {
        // Gán các giá trị @Value thủ công cho unit test
        ReflectionTestUtils.setField(xpService, "baseRatePerMinute", 10);
        ReflectionTestUtils.setField(xpService, "pomodoroBonusPercentage", 10);
    }

    @Test
    void calculateXpEarned_ShouldReturnBaseXp_WhenShortDuration() {
        // 5 phút = 300 giây -> 50 XP
        int xp = xpService.calculateXpEarned(300);
        assertEquals(50, xp);
    }

    @Test
    void calculateXpEarned_ShouldReturnBonusXp_WhenPomodoroDuration() {
        // 25 phút = 1500 giây -> 250 XP base + 10% bonus (25 XP) = 275 XP
        int xp = xpService.calculateXpEarned(1500);
        assertEquals(275, xp);
    }

    @Test
    void addXp_ShouldLevelUp_WhenXpExceedsRequired() {
        User user = User.builder()
                .currentLevel(1)
                .currentXp(0)
                .totalXp(0L)
                .build();

        // Level 1 yêu cầu 100 XP để lên Level 2
        when(xpLevelConfigRepository.findById(1))
                .thenReturn(Optional.of(new XpLevelConfig(1, 100)));
        // Level 2 yêu cầu 283 XP để lên Level 3
        when(xpLevelConfigRepository.findById(2))
                .thenReturn(Optional.of(new XpLevelConfig(2, 283)));

        // Cộng 120 XP -> level mới là 2, currentXp dư 20, totalXp = 120
        XpService.XpCalculationResult result = xpService.addXp(user, 120);

        assertTrue(result.leveledUp());
        assertEquals(1, result.levelBefore());
        assertEquals(2, result.levelAfter());
        assertEquals(0, result.xpBefore());
        assertEquals(20, result.xpAfter());
        assertEquals(283, result.xpRequiredForNextLevel());

        assertEquals(2, user.getCurrentLevel());
        assertEquals(20, user.getCurrentXp());
        assertEquals(120L, user.getTotalXp());
    }

    @Test
    void addXp_ShouldLevelUpMultipleTimes_WhenHugeXpAdded() {
        User user = User.builder()
                .currentLevel(1)
                .currentXp(0)
                .totalXp(0L)
                .build();

        // Cần 100 XP từ level 1->2
        when(xpLevelConfigRepository.findById(1))
                .thenReturn(Optional.of(new XpLevelConfig(1, 100)));
        // Cần 200 XP từ level 2->3
        when(xpLevelConfigRepository.findById(2))
                .thenReturn(Optional.of(new XpLevelConfig(2, 200)));
        // Cần 300 XP từ level 3->4
        when(xpLevelConfigRepository.findById(3))
                .thenReturn(Optional.of(new XpLevelConfig(3, 300)));

        // Cộng 350 XP -> Lên level 2 (còn 250), Lên level 3 (còn 50), dừng lại (chưa đủ 300)
        XpService.XpCalculationResult result = xpService.addXp(user, 350);

        assertTrue(result.leveledUp());
        assertEquals(3, result.levelAfter());
        assertEquals(50, result.xpAfter());
        assertEquals(300, result.xpRequiredForNextLevel());
    }
}
