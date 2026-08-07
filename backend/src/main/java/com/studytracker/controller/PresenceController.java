package com.studytracker.controller;

import com.studytracker.dto.PresenceBatchDTO;
import com.studytracker.model.User;
import com.studytracker.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/presence")
@RequiredArgsConstructor
public class PresenceController {

    private final PresenceService presenceService;

    @PostMapping("/batch")
    public ResponseEntity<Map<String, Object>> saveBatchPresence(
            @AuthenticationPrincipal User user,
            @RequestBody PresenceBatchDTO batchDTO
    ) {
        int savedCount = presenceService.saveBatchPresenceLogs(user, batchDTO);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "savedCount", savedCount
        ));
    }
}
