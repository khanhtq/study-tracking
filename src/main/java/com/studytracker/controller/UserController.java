package com.studytracker.controller;

import com.studytracker.dto.*;
import com.studytracker.model.User;
import com.studytracker.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Users", description = "APIs Quản lý người dùng, Hồ sơ cá nhân, Avatar & Tìm kiếm")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserProgressResponse> getMyProgress(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userService.getUserProgress(user));
    }

    @PostMapping("/premium/toggle")
    public ResponseEntity<UserProgressResponse> togglePremium(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userService.togglePremium(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProgressResponse> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(user, request));
    }

    @PostMapping("/avatar")
    public ResponseEntity<UserProgressResponse> uploadAvatar(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userService.uploadAvatar(user, file));
    }

    @PutMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal User user,
            @RequestBody ChangePasswordRequest request) {
        userService.changePassword(user, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/titles")
    public ResponseEntity<List<TitleOptionDto>> getAvailableTitles(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userService.getAvailableTitles(user));
    }

    @GetMapping("/online")
    public ResponseEntity<List<OnlineUserResponse>> getOnlineUsers(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userService.getOnlineUsers(user));
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserSearchResponseDto>> searchUsers(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "q", required = false, defaultValue = "") String query) {
        return ResponseEntity.ok(userService.searchUsers(query, user));
    }

    @GetMapping("/{userId}/public-profile")
    public ResponseEntity<PublicUserProfileDto> getPublicProfile(
            @PathVariable("userId") UUID userId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(userService.getPublicProfile(userId, currentUser));
    }
}
