package com.studytracker.controller;

import com.studytracker.dto.*;
import com.studytracker.model.User;
import com.studytracker.service.GroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Community Groups", description = "APIs Quản lý Nhóm cộng đồng, Phân quyền, Thành viên & Link mời")
@RestController
@RequestMapping("/api/v1/chat/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    // ==================== 1. CRUD NHÓM ====================

    @Operation(summary = "Tạo nhóm cộng đồng mới")
    @PostMapping
    public ResponseEntity<GroupSummaryDto> createGroup(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateGroupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(groupService.createGroup(currentUser, request));
    }

    @Operation(summary = "Cập nhật thông tin nhóm")
    @PutMapping("/{groupId}")
    public ResponseEntity<GroupSummaryDto> updateGroup(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateGroupRequest request) {
        return ResponseEntity.ok(groupService.updateGroup(groupId, currentUser, request));
    }

    @Operation(summary = "Xóa nhóm")
    @DeleteMapping("/{groupId}")
    public ResponseEntity<Void> deleteGroup(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        groupService.deleteGroup(groupId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Lấy thông tin chi tiết nhóm")
    @GetMapping("/{groupId}")
    public ResponseEntity<GroupDetailDto> getGroupDetail(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(groupService.getGroupDetail(groupId, currentUser));
    }

    @Operation(summary = "Lấy danh sách nhóm của tôi")
    @GetMapping("/my")
    public ResponseEntity<List<GroupSummaryDto>> getMyGroups(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(groupService.getMyGroups(currentUser));
    }

    @Operation(summary = "Khám phá các nhóm công khai phổ biến nhất")
    @GetMapping("/popular")
    public ResponseEntity<Page<GroupSummaryDto>> getPopularGroups(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @AuthenticationPrincipal User currentUser) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return ResponseEntity.ok(groupService.getPopularGroups(pageable, currentUser));
    }

    @Operation(summary = "Tìm kiếm nhóm công khai")
    @GetMapping("/search")
    public ResponseEntity<Page<GroupSummaryDto>> searchGroups(
            @RequestParam(name = "q", defaultValue = "") String query,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @AuthenticationPrincipal User currentUser) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return ResponseEntity.ok(groupService.searchGroups(query, pageable, currentUser));
    }

    // ==================== 2. THAM GIA / RỜI NHÓM & DUYỆT YÊU CẦU ====================

    @Operation(summary = "Tham gia nhóm hoặc gửi yêu cầu tham gia")
    @PostMapping("/{groupId}/join")
    public ResponseEntity<GroupSummaryDto> joinGroup(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser,
            @RequestBody(required = false) CreateJoinRequestDto request) {
        return ResponseEntity.ok(groupService.joinGroup(groupId, currentUser, request));
    }

    @Operation(summary = "Rời khỏi nhóm")
    @PostMapping("/{groupId}/leave")
    public ResponseEntity<Void> leaveGroup(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        groupService.leaveGroup(groupId, currentUser);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Lấy danh sách yêu cầu tham gia nhóm chờ duyệt")
    @GetMapping("/{groupId}/join-requests")
    public ResponseEntity<List<GroupJoinRequestDto>> getPendingJoinRequests(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(groupService.getPendingJoinRequests(groupId, currentUser));
    }

    @Operation(summary = "Phê duyệt hoặc từ chối yêu cầu tham gia nhóm")
    @PutMapping("/{groupId}/join-requests/{requestId}")
    public ResponseEntity<Void> reviewJoinRequest(
            @PathVariable("groupId") UUID groupId,
            @PathVariable("requestId") UUID requestId,
            @RequestParam("approved") boolean approved,
            @AuthenticationPrincipal User currentUser) {
        groupService.reviewJoinRequest(groupId, requestId, approved, currentUser);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Mời bạn bè vào nhóm")
    @PostMapping("/{groupId}/invite-friends")
    public ResponseEntity<Void> inviteFriends(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody InviteFriendsRequest request) {
        groupService.inviteFriends(groupId, request.getFriendIds(), currentUser);
        return ResponseEntity.ok().build();
    }

    // ==================== 3. QUẢN TRỊ THÀNH VIÊN ====================

    @Operation(summary = "Lấy danh sách thành viên trong nhóm")
    @GetMapping("/{groupId}/members")
    public ResponseEntity<Page<GroupMemberDto>> getMembers(
            @PathVariable("groupId") UUID groupId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size,
            @AuthenticationPrincipal User currentUser) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(200, Math.max(1, size)));
        return ResponseEntity.ok(groupService.getMembers(groupId, pageable, currentUser));
    }

    @Operation(summary = "Xóa thành viên khỏi nhóm (Kick)")
    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<Void> kickMember(
            @PathVariable("groupId") UUID groupId,
            @PathVariable("userId") UUID userId,
            @AuthenticationPrincipal User currentUser) {
        groupService.kickMember(groupId, userId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Tắt quyền chat của thành viên (Mute)")
    @PostMapping("/{groupId}/members/{userId}/mute")
    public ResponseEntity<Void> muteMember(
            @PathVariable("groupId") UUID groupId,
            @PathVariable("userId") UUID userId,
            @AuthenticationPrincipal User currentUser,
            @RequestBody(required = false) MuteMemberRequest request) {
        groupService.muteMember(groupId, userId, request, currentUser);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Bật lại quyền chat cho thành viên (Unmute)")
    @PostMapping("/{groupId}/members/{userId}/unmute")
    public ResponseEntity<Void> unmuteMember(
            @PathVariable("groupId") UUID groupId,
            @PathVariable("userId") UUID userId,
            @AuthenticationPrincipal User currentUser) {
        groupService.unmuteMember(groupId, userId, currentUser);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Cập nhật vai trò thành viên (Admin/Mod/Chuyển Owner)")
    @PutMapping("/{groupId}/members/{userId}/role")
    public ResponseEntity<Void> updateMemberRole(
            @PathVariable("groupId") UUID groupId,
            @PathVariable("userId") UUID userId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateMemberRoleRequest request) {
        groupService.updateMemberRole(groupId, userId, request, currentUser);
        return ResponseEntity.ok().build();
    }

    // ==================== 4. LINK MỜI THAM GIA NHÓM ====================

    @Operation(summary = "Tạo link mời tham gia nhóm")
    @PostMapping("/{groupId}/invites")
    public ResponseEntity<GroupInviteLinkDto> createInviteLink(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser,
            @RequestBody(required = false) CreateInviteLinkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(groupService.createInviteLink(groupId, request, currentUser));
    }

    @Operation(summary = "Lấy danh sách link mời đang hoạt động của nhóm")
    @GetMapping("/{groupId}/invites")
    public ResponseEntity<List<GroupInviteLinkDto>> getInviteLinks(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(groupService.getInviteLinks(groupId, currentUser));
    }

    @Operation(summary = "Thu hồi link mời tham gia nhóm")
    @DeleteMapping("/{groupId}/invites/{inviteId}")
    public ResponseEntity<Void> revokeInviteLink(
            @PathVariable("groupId") UUID groupId,
            @PathVariable("inviteId") UUID inviteId,
            @AuthenticationPrincipal User currentUser) {
        groupService.revokeInviteLink(groupId, inviteId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
