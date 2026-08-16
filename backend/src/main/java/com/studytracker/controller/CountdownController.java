package com.studytracker.controller;

import com.studytracker.dto.CountdownDto;
import com.studytracker.dto.CreateCountdownRequest;
import com.studytracker.dto.SystemPresetExamDto;
import com.studytracker.model.User;
import com.studytracker.service.CountdownService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/countdowns")
@RequiredArgsConstructor
public class CountdownController {

    private final CountdownService countdownService;

    @GetMapping("/presets")
    public ResponseEntity<List<SystemPresetExamDto>> getPresetExams(
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(countdownService.getAllPresets(search));
    }

    @GetMapping
    public ResponseEntity<List<CountdownDto>> getUserCountdowns(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(countdownService.getUserCountdowns(user.getId()));
    }

    @PostMapping
    public ResponseEntity<CountdownDto> createCountdown(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateCountdownRequest request) {
        return ResponseEntity.ok(countdownService.createCountdown(user.getId(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CountdownDto> updateCountdown(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @Valid @RequestBody CreateCountdownRequest request) {
        return ResponseEntity.ok(countdownService.updateCountdown(user.getId(), id, request));
    }

    @RequestMapping(value = "/{id}/pin", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<CountdownDto> pinCountdown(
            @AuthenticationPrincipal User user,
            @PathVariable String id) {
        return ResponseEntity.ok(countdownService.pinCountdown(user.getId(), id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCountdown(
            @AuthenticationPrincipal User user,
            @PathVariable String id) {
        countdownService.deleteCountdown(user.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
