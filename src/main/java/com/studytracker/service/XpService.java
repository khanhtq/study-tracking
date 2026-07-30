package com.studytracker.service;

import com.studytracker.event.XpEarnedEvent;
import com.studytracker.model.User;
import com.studytracker.repository.XpLevelConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class XpService {

    private final XpLevelConfigRepository xpLevelConfigRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PaymentService paymentService;

    @Value("${app.xp.base-rate-per-minute:10}")
    private int baseRatePerMinute;

    @Value("${app.xp.pomodoro-bonus-percentage:10}")
    private int pomodoroBonusPercentage;

    public int calculateXpEarned(int durationSeconds) {
        return calculateXpEarned(durationSeconds, null);
    }

    /**
     * Quy đổi thời gian học (giây) sang XP.
     * 1 phút = baseRate XP.
     * Nếu thời gian >= 25 phút (1500 giây) -> cộng thêm bonusPercentage%.
     * Nếu user là Premium -> cộng thêm +15% Premium Bonus.
     */
    public int calculateXpEarned(int durationSeconds, User user) {
        double minutes = (double) durationSeconds / 60.0;
        double baseXp = minutes * baseRatePerMinute;
        double totalXp = baseXp;

        // Nếu học >= 25 phút (Pomodoro session)
        if (durationSeconds >= 1500) {
            totalXp += baseXp * ((double) pomodoroBonusPercentage / 100.0);
        }

        // Thưởng thêm +15% cho tài khoản Premium active
        if (user != null && paymentService.isUserPremium(user)) {
            totalXp += baseXp * 0.15;
        }

        return (int) Math.round(totalXp);
    }

    /**
     * Lấy XP cần thiết để lên level tiếp theo.
     */
    public int getXpRequiredForNextLevel(int currentLevel) {
        return xpLevelConfigRepository.findById(currentLevel)
                .map(config -> config.getXpRequired())
                .orElseGet(() -> (int) Math.round(100 * Math.pow(currentLevel, 1.5)));
    }

    /**
     * DTO nội bộ để lưu giữ kết quả tính toán cộng XP.
     */
    public record XpCalculationResult(
            int levelBefore,
            int levelAfter,
            int xpBefore,
            int xpAfter,
            int xpRequiredForNextLevel,
            boolean leveledUp
    ) {}

    /**
     * Cộng XP cho User, kiểm tra thăng cấp (có thể lên nhiều level cùng lúc).
     */
    @Transactional
    public XpCalculationResult addXp(User user, int xpEarned) {
        int levelBefore = user.getCurrentLevel();
        int xpBefore = user.getCurrentXp();

        long totalXp = user.getTotalXp() + xpEarned;
        int currentXp = user.getCurrentXp() + xpEarned;
        int currentLevel = user.getCurrentLevel();

        boolean leveledUp = false;

        while (true) {
            int xpRequired = getXpRequiredForNextLevel(currentLevel);
            if (currentXp >= xpRequired) {
                currentXp -= xpRequired;
                currentLevel++;
                leveledUp = true;
            } else {
                break;
            }
        }

        user.setTotalXp(totalXp);
        user.setCurrentXp(currentXp);
        user.setCurrentLevel(currentLevel);

        // Bắn event để xử lý đồng bộ Redis Leaderboard bất đồng bộ
        eventPublisher.publishEvent(new XpEarnedEvent(this, user.getId(), xpEarned, totalXp));

        int xpRequiredForNextLevel = getXpRequiredForNextLevel(currentLevel);

        return new XpCalculationResult(
                levelBefore,
                currentLevel,
                xpBefore,
                currentXp,
                xpRequiredForNextLevel,
                leveledUp
        );
    }
}
