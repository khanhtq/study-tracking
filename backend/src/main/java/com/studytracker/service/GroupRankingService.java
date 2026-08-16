package com.studytracker.service;

import com.studytracker.model.ChatGroup;
import com.studytracker.repository.ChatGroupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupRankingService {

    private static final String POPULARITY_KEY = "ranking:groups:popularity";

    private final StringRedisTemplate redisTemplate;
    private final ChatGroupRepository chatGroupRepository;

    public void updateGroupScore(UUID groupId, double score) {
        try {
            redisTemplate.opsForZSet().add(POPULARITY_KEY, groupId.toString(), score);
        } catch (Exception e) {
            log.warn("Lỗi cập nhật điểm xếp hạng nhóm lên Redis: {}", e.getMessage());
        }
    }

    public void incrementScore(UUID groupId, double delta) {
        try {
            redisTemplate.opsForZSet().incrementScore(POPULARITY_KEY, groupId.toString(), delta);
        } catch (Exception e) {
            log.warn("Lỗi tăng điểm xếp hạng nhóm trên Redis: {}", e.getMessage());
        }
    }

    public void removeGroup(UUID groupId) {
        try {
            redisTemplate.opsForZSet().remove(POPULARITY_KEY, groupId.toString());
        } catch (Exception e) {
            log.warn("Lỗi xóa nhóm khỏi Redis ranking: {}", e.getMessage());
        }
    }

    public List<UUID> getPopularGroupIds(int offset, int limit) {
        try {
            Set<String> members = redisTemplate.opsForZSet().reverseRange(POPULARITY_KEY, offset, offset + limit - 1);
            if (members != null && !members.isEmpty()) {
                return members.stream()
                        .map(UUID::fromString)
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.warn("Lỗi lấy danh sách nhóm phổ biến từ Redis, fallback sang PostgreSQL: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    @Scheduled(cron = "0 */30 * * * *")
    public void syncAllGroupScores() {
        try {
            List<ChatGroup> publicGroups = chatGroupRepository.findAll().stream()
                    .filter(g -> !g.getIsArchived())
                    .toList();

            if (publicGroups.isEmpty()) return;

            Set<ZSetOperations.TypedTuple<String>> tuples = new HashSet<>();
            for (ChatGroup group : publicGroups) {
                double score = group.getMemberCount() * 1.0 + (group.getMessageCount() != null ? group.getMessageCount() * 0.1 : 0.0);
                group.setPopularityScore(score);
                tuples.add(ZSetOperations.TypedTuple.of(group.getId().toString(), score));
            }
            chatGroupRepository.saveAll(publicGroups);

            redisTemplate.delete(POPULARITY_KEY);
            redisTemplate.opsForZSet().add(POPULARITY_KEY, tuples);
            log.info("Đã đồng bộ {} nhóm vào bảng xếp hạng Redis ZSET thành công.", tuples.size());
        } catch (Exception e) {
            log.warn("Lỗi đồng bộ định kỳ nhóm lên Redis: {}", e.getMessage());
        }
    }
}
