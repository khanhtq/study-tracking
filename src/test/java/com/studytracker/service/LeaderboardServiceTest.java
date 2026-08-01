package com.studytracker.service;

import com.studytracker.dto.LeaderboardEntryDto;
import com.studytracker.dto.UserRankDto;
import com.studytracker.model.User;
import com.studytracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.DefaultTypedTuple;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaderboardServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ZSetOperations<String, String> zSetOperations;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PaymentService paymentService;

    @InjectMocks
    private LeaderboardService leaderboardService;

    private User testUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        testUser = User.builder()
                .id(userId)
                .email("test@example.com")
                .displayName("Tester")
                .currentLevel(5)
                .totalXp(1200L)
                .selectedTitle("Tập Trung Cao Độ")
                .build();
    }

    @Test
    @DisplayName("Should update user XP score in Redis ZSET")
    void shouldUpdateUserXpInRedis() {
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);

        leaderboardService.updateUserXpInRedis(userId, 1200L);

        verify(zSetOperations, times(1)).add(LeaderboardService.KEY_ALL_TIME, userId.toString(), 1200.0);
    }

    @Test
    @DisplayName("Should return top leaderboard entries from Redis ZSET")
    void shouldReturnTopLeaderboard() {
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);

        Set<ZSetOperations.TypedTuple<String>> mockTuples = new LinkedHashSet<>();
        mockTuples.add(new DefaultTypedTuple<>(userId.toString(), 1200.0));

        when(zSetOperations.reverseRangeWithScores(LeaderboardService.KEY_ALL_TIME, 0, 9))
                .thenReturn(mockTuples);

        when(userRepository.findAllById(anyList())).thenReturn(Collections.singletonList(testUser));
        when(paymentService.isUserPremium(any())).thenReturn(false);

        List<LeaderboardEntryDto> leaderboard = leaderboardService.getTopLeaderboard(10);

        assertThat(leaderboard).hasSize(1);
        assertThat(leaderboard.get(0).getRank()).isEqualTo(1);
        assertThat(leaderboard.get(0).getUserId()).isEqualTo(userId);
        assertThat(leaderboard.get(0).getDisplayName()).isEqualTo("Tester");
        assertThat(leaderboard.get(0).getTotalXp()).isEqualTo(1200L);
    }

    @Test
    @DisplayName("Should return user rank accurately (1-indexed)")
    void shouldReturnUserRank() {
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(zSetOperations.reverseRank(LeaderboardService.KEY_ALL_TIME, userId.toString())).thenReturn(2L); // 0-indexed rank 2 means 3rd place
        when(zSetOperations.zCard(LeaderboardService.KEY_ALL_TIME)).thenReturn(50L);

        UserRankDto userRank = leaderboardService.getUserRank(testUser);

        assertThat(userRank).isNotNull();
        assertThat(userRank.getRank()).isEqualTo(3L);
        assertThat(userRank.getTotalUsers()).isEqualTo(50L);
        assertThat(userRank.getUserId()).isEqualTo(userId);
    }

    @Test
    @DisplayName("Should sync all real users to Redis ZSET in single batch")
    void shouldSyncAllUsersToRedisInBatch() {
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(userRepository.findAllRealUsers()).thenReturn(List.of(testUser));

        leaderboardService.syncAllUsersToRedis();

        verify(zSetOperations, times(1)).add(eq(LeaderboardService.KEY_ALL_TIME), anySet());
    }
}
