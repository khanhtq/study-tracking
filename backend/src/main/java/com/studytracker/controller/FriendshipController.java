package com.studytracker.controller;

import com.studytracker.dto.FriendDto;
import com.studytracker.dto.FriendshipStatusDto;
import com.studytracker.model.User;
import com.studytracker.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendshipController {

    private final FriendshipService friendshipService;

    @PostMapping("/request/{userId}")
    public ResponseEntity<FriendshipStatusDto> sendFriendRequest(
            @AuthenticationPrincipal User currentUser,
            @PathVariable("userId") UUID userId) {
        return ResponseEntity.ok(friendshipService.sendFriendRequest(currentUser, userId));
    }

    @PutMapping("/accept/{friendshipId}")
    public ResponseEntity<Void> acceptFriendRequest(
            @AuthenticationPrincipal User currentUser,
            @PathVariable("friendshipId") UUID friendshipId) {
        friendshipService.acceptFriendRequest(currentUser, friendshipId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/decline/{friendshipId}")
    public ResponseEntity<Void> declineFriendRequest(
            @AuthenticationPrincipal User currentUser,
            @PathVariable("friendshipId") UUID friendshipId) {
        friendshipService.declineFriendRequest(currentUser, friendshipId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{friendId}")
    public ResponseEntity<Void> unfriend(
            @AuthenticationPrincipal User currentUser,
            @PathVariable("friendId") UUID friendId) {
        friendshipService.unfriend(currentUser, friendId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<FriendDto>> getFriends(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(friendshipService.getFriends(currentUser));
    }

    @GetMapping("/requests/received")
    public ResponseEntity<List<FriendDto>> getPendingRequestsReceived(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(friendshipService.getPendingRequestsReceived(currentUser));
    }

    @GetMapping("/requests/sent")
    public ResponseEntity<List<FriendDto>> getPendingRequestsSent(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(friendshipService.getPendingRequestsSent(currentUser));
    }

    @GetMapping("/status/{userId}")
    public ResponseEntity<FriendshipStatusDto> getRelationStatus(
            @AuthenticationPrincipal User currentUser,
            @PathVariable("userId") UUID userId) {
        return ResponseEntity.ok(friendshipService.getRelationStatus(currentUser, userId));
    }
}
