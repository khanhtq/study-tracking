package com.studytracker.controller;

import com.studytracker.dto.LeaderboardEntryDto;
import com.studytracker.dto.UserRankDto;
import com.studytracker.model.User;
import com.studytracker.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    @GetMapping("/top")
    public ResponseEntity<List<LeaderboardEntryDto>> getTopLeaderboard(
            @RequestParam(value = "limit", defaultValue = "10") int limit) {
        return ResponseEntity.ok(leaderboardService.getTopLeaderboard(limit));
    }

    @GetMapping("/me")
    public ResponseEntity<UserRankDto> getMyRank(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(leaderboardService.getUserRank(user));
    }

    @PostMapping("/sync")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> syncAllToRedis() {
        leaderboardService.syncAllUsersToRedis();
        return ResponseEntity.ok("Leaderboard cache successfully synced from Database to Redis ZSET.");
    }
}
