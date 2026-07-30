package com.studytracker.service;

import com.studytracker.dto.LeaderboardEntryDto;
import com.studytracker.dto.UserRankDto;
import com.studytracker.model.User;
import com.studytracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class LeaderboardService {

    public static final String KEY_ALL_TIME = "leaderboard:all_time";

    private final StringRedisTemplate redisTemplate;
    private final UserRepository userRepository;

    /**
     * Cập nhật điểm XP của người dùng vào Redis Sorted Set.
     */
    public void updateUserXpInRedis(UUID userId, long totalXp) {
        try {
            redisTemplate.opsForZSet().add(KEY_ALL_TIME, userId.toString(), (double) totalXp);
            log.debug("Updated Redis ZSET for userId {} with totalXp {}", userId, totalXp);
        } catch (Exception e) {
            log.error("Failed to update Redis Leaderboard for user {}", userId, e);
        }
    }

    /**
     * Lấy danh sách Top Leaderboard (0 -> limit - 1).
     */
    public List<LeaderboardEntryDto> getTopLeaderboard(int limit) {
        if (limit <= 0) limit = 10;
        if (limit > 100) limit = 100;

        Set<ZSetOperations.TypedTuple<String>> range = redisTemplate.opsForZSet()
                .reverseRangeWithScores(KEY_ALL_TIME, 0, limit - 1);

        // Nếu Redis rỗng -> Warmup từ Postgres DB
        if (range == null || range.isEmpty()) {
            log.info("Redis Leaderboard is empty. Running cache warmup from Database...");
            syncAllUsersToRedis();
            range = redisTemplate.opsForZSet().reverseRangeWithScores(KEY_ALL_TIME, 0, limit - 1);
        }

        if (range == null || range.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> userIds = new ArrayList<>();
        Map<UUID, Long> userXpMap = new LinkedHashMap<>();

        for (ZSetOperations.TypedTuple<String> tuple : range) {
            if (tuple.getValue() != null) {
                try {
                    UUID id = UUID.fromString(tuple.getValue());
                    userIds.add(id);
                    long score = tuple.getScore() != null ? tuple.getScore().longValue() : 0L;
                    userXpMap.put(id, score);
                } catch (IllegalArgumentException ignored) {}
            }
        }

        // Hydrate thông tin User từ Database
        List<User> users = userRepository.findAllById(userIds);
        Map<UUID, User> userEntityMap = new HashMap<>();
        for (User u : users) {
            userEntityMap.put(u.getId(), u);
        }

        List<LeaderboardEntryDto> result = new ArrayList<>();
        long rank = 1;

        for (UUID userId : userIds) {
            User user = userEntityMap.get(userId);
            if (user != null && user.getRole() != com.studytracker.model.Role.ROLE_ADMIN) {
                result.add(LeaderboardEntryDto.builder()
                        .rank(rank)
                        .userId(user.getId())
                        .displayName(user.getDisplayName() != null ? user.getDisplayName() : user.getEmail())
                        .avatarUrl(user.getAvatarUrl())
                        .selectedTitle(user.getSelectedTitle())
                        .isPremium(user.isPremiumActive())
                        .currentLevel(user.getCurrentLevel())
                        .totalXp(userXpMap.getOrDefault(userId, user.getTotalXp()))
                        .build());
                rank++;
            }
        }

        return result;
    }

    /**
     * Lấy vị trí thứ hạng (Rank) của một User cụ thể.
     */
    public UserRankDto getUserRank(User user) {
        String userIdStr = user.getId().toString();
        Long reverseRank = redisTemplate.opsForZSet().reverseRank(KEY_ALL_TIME, userIdStr);

        if (reverseRank == null) {
            // Re-sync user into ZSET
            updateUserXpInRedis(user.getId(), user.getTotalXp());
            reverseRank = redisTemplate.opsForZSet().reverseRank(KEY_ALL_TIME, userIdStr);
        }

        Long totalUsers = redisTemplate.opsForZSet().zCard(KEY_ALL_TIME);
        long rank = (reverseRank != null) ? reverseRank + 1 : -1;

        return UserRankDto.builder()
                .userId(user.getId())
                .displayName(user.getDisplayName() != null ? user.getDisplayName() : user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .rank(rank)
                .totalXp(user.getTotalXp())
                .currentLevel(user.getCurrentLevel())
                .totalUsers(totalUsers != null ? totalUsers : 0L)
                .build();
    }

    /**
     * Đồng bộ toàn bộ User từ PostgreSQL sang Redis (Warmup Data).
     */
    public void syncAllUsersToRedis() {
        log.info("Starting synchronization of all users totalXP to Redis ZSET...");
        List<User> users = userRepository.findAll();
        for (User user : users) {
            redisTemplate.opsForZSet().add(KEY_ALL_TIME, user.getId().toString(), (double) user.getTotalXp());
        }
        log.info("Successfully synced {} users to Redis Leaderboard ZSET.", users.size());
    }
}
