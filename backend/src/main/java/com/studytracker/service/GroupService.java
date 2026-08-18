package com.studytracker.service;

import com.studytracker.dto.*;
import com.studytracker.model.*;
import com.studytracker.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupService {

    private final ChatGroupRepository chatGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupJoinRequestRepository groupJoinRequestRepository;
    private final GroupInviteLinkRepository groupInviteLinkRepository;
    private final GroupPinnedMessageRepository groupPinnedMessageRepository;
    private final UserRepository userRepository;
    private final GroupRankingService groupRankingService;
    private final GroupMessageRepository groupMessageRepository;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    private static final Pattern NONLATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    // ==================== 1. CRUD NHÓM ====================

    @Transactional
    public GroupSummaryDto createGroup(User currentUser, CreateGroupRequest request) {
        String baseSlug = toSlug(request.getName());
        String slug = baseSlug;
        int counter = 1;
        while (chatGroupRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter++;
        }

        ChatGroup group = ChatGroup.builder()
                .name(request.getName().trim())
                .slug(slug)
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .privacy(request.getPrivacy() != null ? request.getPrivacy() : GroupPrivacy.PUBLIC)
                .joinPolicy(request.getJoinPolicy() != null ? request.getJoinPolicy() : GroupJoinPolicy.OPEN)
                .maxMembers(request.getMaxMembers() != null && request.getMaxMembers() > 0 ? request.getMaxMembers() : 5000)
                .avatarUrl(request.getAvatarUrl())
                .coverUrl(request.getCoverUrl())
                .owner(currentUser)
                .memberCount(1)
                .messageCount(0L)
                .popularityScore(1.0)
                .isArchived(false)
                .build();

        ChatGroup savedGroup = chatGroupRepository.save(group);

        GroupMember ownerMember = GroupMember.builder()
                .group(savedGroup)
                .user(currentUser)
                .role(GroupRole.OWNER)
                .status(GroupMemberStatus.ACTIVE)
                .build();
        groupMemberRepository.save(ownerMember);

        if (savedGroup.getPrivacy() == GroupPrivacy.PUBLIC) {
            groupRankingService.updateGroupScore(savedGroup.getId(), 1.0);
        }

        log.info("Người dùng [{}] đã tạo nhóm mới: [{}] ({})", currentUser.getUsername(), savedGroup.getName(), savedGroup.getId());
        return mapToSummaryDto(savedGroup, currentUser);
    }

    @Transactional
    public GroupSummaryDto updateGroup(UUID groupId, User currentUser, UpdateGroupRequest request) {
        ChatGroup group = getGroupEntity(groupId);
        verifyGroupAdminOrOwner(group, currentUser);

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            group.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            group.setDescription(request.getDescription().trim());
        }
        if (request.getPrivacy() != null) {
            group.setPrivacy(request.getPrivacy());
            if (request.getPrivacy() == GroupPrivacy.PRIVATE) {
                groupRankingService.removeGroup(groupId);
            } else {
                groupRankingService.updateGroupScore(groupId, group.getPopularityScore());
            }
        }
        if (request.getJoinPolicy() != null) {
            group.setJoinPolicy(request.getJoinPolicy());
        }
        if (request.getMaxMembers() != null && request.getMaxMembers() > 0) {
            if (request.getMaxMembers() < group.getMemberCount()) {
                throw new IllegalArgumentException("Giới hạn thành viên không thể nhỏ hơn số lượng thành viên hiện tại (" + group.getMemberCount() + ")");
            }
            group.setMaxMembers(request.getMaxMembers());
        }
        if (request.getAvatarUrl() != null) {
            group.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getCoverUrl() != null) {
            group.setCoverUrl(request.getCoverUrl());
        }

        ChatGroup updated = chatGroupRepository.save(group);
        return mapToSummaryDto(updated, currentUser);
    }

    @Transactional
    public void deleteGroup(UUID groupId, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        if (!group.getOwner().getId().equals(currentUser.getId()) && !currentUser.getRole().name().equals("ROLE_ADMIN")) {
            throw new SecurityException("Chỉ chủ nhóm hoặc Quản trị viên hệ thống mới có quyền xóa nhóm");
        }

        group.setDeletedAt(Instant.now());
        group.setDeletedBy(currentUser);
        group.setIsArchived(true);
        chatGroupRepository.save(group);

        groupRankingService.removeGroup(groupId);
        log.info("Nhóm [{}] ({}) đã bị xóa mềm bởi [{}]", group.getName(), groupId, currentUser.getUsername());
    }

    @Transactional(readOnly = true)
    public GroupDetailDto getGroupDetail(UUID groupId, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        Optional<GroupMember> memberOpt = currentUser != null ? groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId()) : Optional.empty();

        if (group.getPrivacy() == GroupPrivacy.PRIVATE && (memberOpt.isEmpty() || memberOpt.get().getStatus() == GroupMemberStatus.BANNED)) {
            throw new SecurityException("Đây là nhóm riêng tư, bạn cần là thành viên để xem thông tin chi tiết");
        }

        List<GroupMemberDto> topMembers = groupMemberRepository.findActiveMembersWithUser(groupId).stream()
                .limit(20)
                .map(this::mapToMemberDto)
                .collect(Collectors.toList());

        List<GroupPinnedMessageDto> pinnedMessages = groupPinnedMessageRepository.findByGroupIdWithDetails(groupId).stream()
                .map(this::mapToPinnedDto)
                .collect(Collectors.toList());

        long pendingCount = 0;
        if (memberOpt.isPresent() && (memberOpt.get().getRole() == GroupRole.OWNER || memberOpt.get().getRole() == GroupRole.ADMIN || memberOpt.get().getRole() == GroupRole.MODERATOR)) {
            pendingCount = groupJoinRequestRepository.countByGroupIdAndStatus(groupId, JoinRequestStatus.PENDING);
        }

        return GroupDetailDto.builder()
                .group(mapToSummaryDto(group, currentUser))
                .topMembers(topMembers)
                .pinnedMessages(pinnedMessages)
                .pendingRequestCount(pendingCount)
                .build();
    }

    @Transactional(readOnly = true)
    public List<GroupSummaryDto> getMyGroups(User currentUser) {
        List<ChatGroup> groups = chatGroupRepository.findMyActiveGroups(currentUser.getId());
        return groups.stream()
                .map(g -> mapToSummaryDto(g, currentUser))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<GroupSummaryDto> getPopularGroups(Pageable pageable, User currentUser) {
        Page<ChatGroup> groups = chatGroupRepository.findPopularPublicGroups(pageable);
        return groups.map(g -> mapToSummaryDto(g, currentUser));
    }

    @Transactional(readOnly = true)
    public Page<GroupSummaryDto> searchGroups(String query, Pageable pageable, User currentUser) {
        Page<ChatGroup> groups = chatGroupRepository.searchPublicGroups(query != null ? query.trim() : "", pageable);
        return groups.map(g -> mapToSummaryDto(g, currentUser));
    }

    // ==================== 2. THAM GIA / RỜI NHÓM & DUYỆT YÊU CẦU ====================

    @Transactional
    public GroupSummaryDto joinGroup(UUID groupId, User currentUser, CreateJoinRequestDto request) {
        ChatGroup group = getGroupEntity(groupId);

        Optional<GroupMember> existingMember = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId());
        if (existingMember.isPresent()) {
            if (existingMember.get().getStatus() == GroupMemberStatus.BANNED) {
                throw new SecurityException("Bạn đã bị cấm tham gia nhóm này");
            }
            if (existingMember.get().getStatus() == GroupMemberStatus.ACTIVE || existingMember.get().getStatus() == GroupMemberStatus.MUTED) {
                throw new IllegalArgumentException("Bạn đã là thành viên của nhóm này");
            }
        }

        if (group.getMaxMembers() != null && group.getMemberCount() >= group.getMaxMembers()) {
            throw new IllegalArgumentException("Nhóm đã đạt số lượng thành viên tối đa (" + group.getMaxMembers() + ")");
        }

        if (group.getJoinPolicy() == GroupJoinPolicy.OPEN) {
            GroupMember newMember = GroupMember.builder()
                    .group(group)
                    .user(currentUser)
                    .role(GroupRole.MEMBER)
                    .status(GroupMemberStatus.ACTIVE)
                    .build();
            groupMemberRepository.save(newMember);

            group.setMemberCount(group.getMemberCount() + 1);
            updateGroupPopularityScore(group);
            chatGroupRepository.save(group);

            log.info("Người dùng [{}] đã tham gia trực tiếp vào nhóm [{}]", currentUser.getUsername(), group.getName());
            return mapToSummaryDto(group, currentUser);
        } else {
            // APPROVAL_REQUIRED
            Optional<GroupJoinRequest> pendingOpt = groupJoinRequestRepository.findByGroupIdAndUserIdAndStatus(groupId, currentUser.getId(), JoinRequestStatus.PENDING);
            if (pendingOpt.isPresent()) {
                throw new IllegalArgumentException("Bạn đã gửi yêu cầu tham gia nhóm này và đang chờ duyệt");
            }

            GroupJoinRequest joinRequest = GroupJoinRequest.builder()
                    .group(group)
                    .user(currentUser)
                    .status(JoinRequestStatus.PENDING)
                    .requestMessage(request != null ? request.getRequestMessage() : null)
                    .viaInviteLink(false)
                    .build();
            groupJoinRequestRepository.save(joinRequest);

            log.info("Người dùng [{}] đã gửi yêu cầu tham gia nhóm [{}]", currentUser.getUsername(), group.getName());
            return mapToSummaryDto(group, currentUser);
        }
    }

    @Transactional
    public void leaveGroup(UUID groupId, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Bạn không phải là thành viên của nhóm này"));

        if (member.getRole() == GroupRole.OWNER) {
            long otherMembers = groupMemberRepository.countByGroupIdAndStatusIn(groupId, List.of(GroupMemberStatus.ACTIVE, GroupMemberStatus.MUTED));
            if (otherMembers > 1) {
                throw new IllegalArgumentException("Bạn là chủ nhóm, vui lòng chuyển quyền chủ nhóm cho thành viên khác trước khi rời nhóm");
            } else {
                // Nhóm chỉ còn mỗi chủ nhóm -> Xóa nhóm
                deleteGroup(groupId, currentUser);
                return;
            }
        }

        groupMemberRepository.delete(member);
        group.setMemberCount(Math.max(0, group.getMemberCount() - 1));
        updateGroupPopularityScore(group);
        chatGroupRepository.save(group);

        log.info("Người dùng [{}] đã rời nhóm [{}]", currentUser.getUsername(), group.getName());
    }

    @Transactional(readOnly = true)
    public List<GroupJoinRequestDto> getPendingJoinRequests(UUID groupId, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        verifyGroupModeratorOrAdmin(group, currentUser);

        return groupJoinRequestRepository.findPendingRequestsWithUser(groupId, JoinRequestStatus.PENDING).stream()
                .map(this::mapToJoinRequestDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void reviewJoinRequest(UUID groupId, UUID requestId, boolean approved, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        verifyGroupModeratorOrAdmin(group, currentUser);

        GroupJoinRequest request = groupJoinRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu tham gia"));

        if (!request.getGroup().getId().equals(groupId)) {
            throw new IllegalArgumentException("Yêu cầu không thuộc nhóm này");
        }

        if (request.getStatus() != JoinRequestStatus.PENDING) {
            throw new IllegalArgumentException("Yêu cầu này đã được xử lý trước đó");
        }

        request.setStatus(approved ? JoinRequestStatus.APPROVED : JoinRequestStatus.REJECTED);
        request.setReviewedBy(currentUser);
        request.setReviewedAt(Instant.now());
        groupJoinRequestRepository.save(request);

        if (approved) {
            if (group.getMaxMembers() != null && group.getMemberCount() >= group.getMaxMembers()) {
                throw new IllegalArgumentException("Nhóm đã đạt số lượng thành viên tối đa (" + group.getMaxMembers() + ")");
            }

            Optional<GroupMember> existingMemberOpt = groupMemberRepository.findByGroupIdAndUserId(groupId, request.getUser().getId());
            if (existingMemberOpt.isEmpty()) {
                GroupMember newMember = GroupMember.builder()
                        .group(group)
                        .user(request.getUser())
                        .role(GroupRole.MEMBER)
                        .status(GroupMemberStatus.ACTIVE)
                        .build();
                groupMemberRepository.save(newMember);

                group.setMemberCount(group.getMemberCount() + 1);
                updateGroupPopularityScore(group);
                chatGroupRepository.save(group);
            }
        }

        log.info("Yêu cầu [{}] tham gia nhóm [{}] đã được [{}] {}", requestId, group.getName(), currentUser.getUsername(), approved ? "CHẤP THUẬN" : "TỪ CHỐI");
    }

    @Transactional
    public void inviteFriends(UUID groupId, List<UUID> friendIds, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        verifyGroupMember(groupId, currentUser.getId());

        for (UUID friendId : friendIds) {
            User friend = userRepository.findById(friendId).orElse(null);
            if (friend == null) continue;

            if (groupMemberRepository.existsByGroupIdAndUserId(groupId, friendId)) {
                continue;
            }

            if (group.getJoinPolicy() == GroupJoinPolicy.OPEN) {
                GroupMember newMember = GroupMember.builder()
                        .group(group)
                        .user(friend)
                        .role(GroupRole.MEMBER)
                        .status(GroupMemberStatus.ACTIVE)
                        .build();
                groupMemberRepository.save(newMember);
                group.setMemberCount(group.getMemberCount() + 1);
            }
        }
        updateGroupPopularityScore(group);
        chatGroupRepository.save(group);
    }

    // ==================== 3. QUẢN TRỊ THÀNH VIÊN (KICK, MUTE, ROLE) ====================

    @Transactional(readOnly = true)
    public Page<GroupMemberDto> getMembers(UUID groupId, Pageable pageable, User currentUser) {
        getGroupEntity(groupId);
        verifyGroupMember(groupId, currentUser.getId());

        Page<GroupMember> members = groupMemberRepository.findByGroupIdAndStatusInOrderByJoinedAtAsc(groupId, List.of(GroupMemberStatus.ACTIVE, GroupMemberStatus.MUTED), pageable);
        return members.map(this::mapToMemberDto);
    }

    @Transactional
    public void kickMember(UUID groupId, UUID targetUserId, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        GroupMember currentMember = getActiveMember(groupId, currentUser.getId());
        GroupMember targetMember = getActiveMember(groupId, targetUserId);

        if (targetMember.getRole() == GroupRole.OWNER) {
            throw new SecurityException("Không thể xóa Chủ nhóm");
        }

        if (currentMember.getRole() == GroupRole.MEMBER || currentMember.getRole() == GroupRole.MODERATOR) {
            throw new SecurityException("Bạn không có quyền xóa thành viên này khỏi nhóm");
        }

        if (currentMember.getRole() == GroupRole.ADMIN && targetMember.getRole() == GroupRole.ADMIN) {
            throw new SecurityException("Quản trị viên không thể xóa Quản trị viên khác");
        }

        groupMemberRepository.delete(targetMember);
        group.setMemberCount(Math.max(0, group.getMemberCount() - 1));
        updateGroupPopularityScore(group);
        chatGroupRepository.save(group);

        log.info("Người dùng [{}] đã bị xóa khỏi nhóm [{}] bởi [{}]", targetUserId, group.getName(), currentUser.getUsername());
    }

    @Transactional
    public void muteMember(UUID groupId, UUID targetUserId, MuteMemberRequest request, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        GroupMember currentMember = getActiveMember(groupId, currentUser.getId());
        GroupMember targetMember = getActiveMember(groupId, targetUserId);

        if (currentMember.getRole() == GroupRole.MEMBER) {
            throw new SecurityException("Bạn không có quyền tắt chat thành viên");
        }

        if (targetMember.getRole() == GroupRole.OWNER || (currentMember.getRole() == GroupRole.MODERATOR && targetMember.getRole() != GroupRole.MEMBER)) {
            throw new SecurityException("Bạn không đủ quyền để tắt chat thành viên này");
        }

        int duration = (request != null && request.getDurationMinutes() != null) ? request.getDurationMinutes() : 60;
        targetMember.setStatus(GroupMemberStatus.MUTED);
        targetMember.setMutedUntil(Instant.now().plus(duration, ChronoUnit.MINUTES));
        groupMemberRepository.save(targetMember);

        // Gửi tin nhắn SYSTEM cảnh báo vào nhóm
        String targetName = targetMember.getUser().getDisplayName() != null ? targetMember.getUser().getDisplayName() : targetMember.getUser().getUsername();
        GroupMessage systemMsg = GroupMessage.builder()
                .group(group)
                .sender(currentUser)
                .messageType(GroupMessageType.SYSTEM)
                .content("Thành viên [" + targetName + "] đã bị tắt quyền chat trong " + duration + " phút.")
                .hasMentions(false)
                .isEdited(false)
                .isDeleted(false)
                .isPinned(false)
                .build();
        GroupMessage saved = groupMessageRepository.save(systemMsg);

        GroupMessageDto dto = GroupMessageDto.builder()
                .id(saved.getId())
                .groupId(group.getId())
                .sender(mapToUserSummaryDto(currentUser))
                .messageType(GroupMessageType.SYSTEM)
                .content(saved.getContent())
                .hasMentions(false)
                .isEdited(false)
                .isDeleted(false)
                .isPinned(false)
                .reactions(Collections.emptyList())
                .attachments(Collections.emptyList())
                .createdAt(saved.getCreatedAt())
                .build();
        messagingTemplate.convertAndSend("/topic/group." + groupId + ".messages", dto);

        log.info("Người dùng [{}] đã bị tắt chat trong nhóm [{}] trong {} phút bởi [{}]", targetUserId, groupId, duration, currentUser.getUsername());
    }

    @Transactional
    public void unmuteMember(UUID groupId, UUID targetUserId, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        GroupMember currentMember = getActiveMember(groupId, currentUser.getId());
        GroupMember targetMember = getActiveMember(groupId, targetUserId);

        if (currentMember.getRole() == GroupRole.MEMBER) {
            throw new SecurityException("Bạn không có quyền bật lại chat cho thành viên");
        }

        targetMember.setStatus(GroupMemberStatus.ACTIVE);
        targetMember.setMutedUntil(null);
        groupMemberRepository.save(targetMember);

        // Gửi tin nhắn SYSTEM mở lại chat vào nhóm
        String targetName = targetMember.getUser().getDisplayName() != null ? targetMember.getUser().getDisplayName() : targetMember.getUser().getUsername();
        GroupMessage systemMsg = GroupMessage.builder()
                .group(group)
                .sender(currentUser)
                .messageType(GroupMessageType.SYSTEM)
                .content("Thành viên [" + targetName + "] đã được mở lại quyền chat.")
                .hasMentions(false)
                .isEdited(false)
                .isDeleted(false)
                .isPinned(false)
                .build();
        GroupMessage saved = groupMessageRepository.save(systemMsg);

        GroupMessageDto dto = GroupMessageDto.builder()
                .id(saved.getId())
                .groupId(group.getId())
                .sender(mapToUserSummaryDto(currentUser))
                .messageType(GroupMessageType.SYSTEM)
                .content(saved.getContent())
                .hasMentions(false)
                .isEdited(false)
                .isDeleted(false)
                .isPinned(false)
                .reactions(Collections.emptyList())
                .attachments(Collections.emptyList())
                .createdAt(saved.getCreatedAt())
                .build();
        messagingTemplate.convertAndSend("/topic/group." + groupId + ".messages", dto);
    }

    @Transactional
    public void updateMemberRole(UUID groupId, UUID targetUserId, UpdateMemberRoleRequest request, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        GroupMember currentMember = getActiveMember(groupId, currentUser.getId());
        GroupMember targetMember = getActiveMember(groupId, targetUserId);

        if (currentMember.getRole() != GroupRole.OWNER) {
            throw new SecurityException("Chỉ Chủ nhóm mới có quyền thay đổi vai trò của thành viên");
        }

        if (request.getRole() == GroupRole.OWNER) {
            // Chuyển nhượng quyền chủ nhóm
            currentMember.setRole(GroupRole.ADMIN);
            targetMember.setRole(GroupRole.OWNER);
            group.setOwner(targetMember.getUser());
            groupMemberRepository.save(currentMember);
            groupMemberRepository.save(targetMember);
            chatGroupRepository.save(group);
            log.info("Chủ nhóm [{}] đã chuyển giao quyền sở hữu cho [{}]", group.getName(), targetMember.getUser().getUsername());
            return;
        }

        targetMember.setRole(request.getRole());
        groupMemberRepository.save(targetMember);
        log.info("Đã cập nhật vai trò của [{}] trong nhóm [{}] thành [{}]", targetUserId, group.getName(), request.getRole());
    }

    // ==================== 4. LINK MỜI THAM GIA NHÓM ====================

    @Transactional
    public GroupInviteLinkDto createInviteLink(UUID groupId, CreateInviteLinkRequest request, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        verifyGroupModeratorOrAdmin(group, currentUser);

        String code = UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        while (groupInviteLinkRepository.existsByCode(code)) {
            code = UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        }

        Instant expiresAt = null;
        if (request != null && request.getExpiresInDays() != null && request.getExpiresInDays() > 0) {
            expiresAt = Instant.now().plus(request.getExpiresInDays(), ChronoUnit.DAYS);
        }

        GroupInviteLink link = GroupInviteLink.builder()
                .group(group)
                .code(code)
                .createdBy(currentUser)
                .maxUses(request != null ? request.getMaxUses() : null)
                .usedCount(0)
                .expiresAt(expiresAt)
                .isRevoked(false)
                .build();

        GroupInviteLink saved = groupInviteLinkRepository.save(link);
        return mapToInviteLinkDto(saved);
    }

    @Transactional(readOnly = true)
    public List<GroupInviteLinkDto> getInviteLinks(UUID groupId, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        verifyGroupModeratorOrAdmin(group, currentUser);

        return groupInviteLinkRepository.findActiveByGroupId(groupId).stream()
                .map(this::mapToInviteLinkDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void revokeInviteLink(UUID groupId, UUID inviteId, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        verifyGroupModeratorOrAdmin(group, currentUser);

        GroupInviteLink link = groupInviteLinkRepository.findById(inviteId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy link mời"));

        if (!link.getGroup().getId().equals(groupId)) {
            throw new IllegalArgumentException("Link mời không thuộc nhóm này");
        }

        link.setIsRevoked(true);
        groupInviteLinkRepository.save(link);
    }

    @Transactional(readOnly = true)
    public InvitePreviewDto previewInvite(String code, User currentUser) {
        GroupInviteLink link = groupInviteLinkRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Mã mời không tồn tại"));

        ChatGroup group = link.getGroup();
        boolean isExpired = link.getExpiresAt() != null && Instant.now().isAfter(link.getExpiresAt());
        boolean isMaxUsesReached = link.getMaxUses() != null && link.getUsedCount() >= link.getMaxUses();
        boolean isValid = !link.getIsRevoked() && !isExpired && !isMaxUsesReached;

        boolean isAlreadyMember = false;
        boolean hasPendingRequest = false;
        if (currentUser != null) {
            Optional<GroupMember> memberOpt = groupMemberRepository.findByGroupIdAndUserId(group.getId(), currentUser.getId());
            isAlreadyMember = memberOpt.isPresent() && memberOpt.get().getStatus() != GroupMemberStatus.BANNED;

            hasPendingRequest = groupJoinRequestRepository.existsByGroupIdAndUserIdAndStatus(group.getId(), currentUser.getId(), JoinRequestStatus.PENDING);
        }

        return InvitePreviewDto.builder()
                .code(code)
                .group(mapToSummaryDto(group, currentUser))
                .isValid(isValid)
                .isExpired(isExpired)
                .isMaxUsesReached(isMaxUsesReached)
                .isAlreadyMember(isAlreadyMember)
                .hasPendingRequest(hasPendingRequest)
                .build();
    }

    @Transactional
    public GroupSummaryDto joinViaInvite(String code, User currentUser) {
        GroupInviteLink link = groupInviteLinkRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Mã mời không tồn tại"));

        if (!link.isValid()) {
            throw new IllegalArgumentException("Link mời này đã hết hạn hoặc đã hết số lượt sử dụng");
        }

        ChatGroup group = link.getGroup();

        Optional<GroupMember> memberOpt = groupMemberRepository.findByGroupIdAndUserId(group.getId(), currentUser.getId());
        if (memberOpt.isPresent()) {
            if (memberOpt.get().getStatus() == GroupMemberStatus.BANNED) {
                throw new SecurityException("Bạn đã bị cấm tham gia nhóm này");
            }
            if (memberOpt.get().getStatus() == GroupMemberStatus.ACTIVE || memberOpt.get().getStatus() == GroupMemberStatus.MUTED) {
                return mapToSummaryDto(group, currentUser);
            }
        }

        if (group.getMaxMembers() != null && group.getMemberCount() >= group.getMaxMembers()) {
            throw new IllegalArgumentException("Nhóm đã đạt số lượng thành viên tối đa (" + group.getMaxMembers() + ")");
        }

        // Vào nhóm trực tiếp qua link mời
        GroupMember newMember = GroupMember.builder()
                .group(group)
                .user(currentUser)
                .role(GroupRole.MEMBER)
                .status(GroupMemberStatus.ACTIVE)
                .build();
        groupMemberRepository.save(newMember);

        link.setUsedCount(link.getUsedCount() + 1);
        groupInviteLinkRepository.save(link);

        group.setMemberCount(group.getMemberCount() + 1);
        updateGroupPopularityScore(group);
        chatGroupRepository.save(group);

        log.info("Người dùng [{}] đã tham gia nhóm [{}] thành công qua mã mời [{}]", currentUser.getUsername(), group.getName(), code);
        return mapToSummaryDto(group, currentUser);
    }

    // ==================== HELPER METHODS & MAPPERS ====================

    public ChatGroup getGroupEntity(UUID groupId) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhóm với ID: " + groupId));
        if (group.getDeletedAt() != null) {
            throw new IllegalArgumentException("Nhóm này đã bị xóa");
        }
        return group;
    }

    public GroupMember getActiveMember(UUID groupId, UUID userId) {
        return groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thành viên trong nhóm"));
    }

    public void verifyGroupMember(UUID groupId, UUID userId) {
        Optional<GroupMember> memberOpt = groupMemberRepository.findByGroupIdAndUserId(groupId, userId);
        if (memberOpt.isEmpty() || memberOpt.get().getStatus() == GroupMemberStatus.BANNED) {
            throw new SecurityException("Bạn không phải là thành viên hợp lệ của nhóm này");
        }
    }

    private void verifyGroupAdminOrOwner(ChatGroup group, User user) {
        if (group.getOwner().getId().equals(user.getId()) || user.getRole().name().equals("ROLE_ADMIN")) {
            return;
        }
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(group.getId(), user.getId())
                .orElseThrow(() -> new SecurityException("Bạn không có quyền quản trị nhóm này"));
        if (member.getRole() != GroupRole.OWNER && member.getRole() != GroupRole.ADMIN) {
            throw new SecurityException("Bạn không có quyền quản trị nhóm này");
        }
    }

    private void verifyGroupModeratorOrAdmin(ChatGroup group, User user) {
        if (group.getOwner().getId().equals(user.getId()) || user.getRole().name().equals("ROLE_ADMIN")) {
            return;
        }
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(group.getId(), user.getId())
                .orElseThrow(() -> new SecurityException("Bạn không có quyền kiểm duyệt trong nhóm này"));
        if (member.getRole() != GroupRole.OWNER && member.getRole() != GroupRole.ADMIN && member.getRole() != GroupRole.MODERATOR) {
            throw new SecurityException("Bạn không có quyền kiểm duyệt trong nhóm này");
        }
    }

    private void updateGroupPopularityScore(ChatGroup group) {
        double score = group.getMemberCount() * 1.0 + (group.getMessageCount() != null ? group.getMessageCount() * 0.1 : 0.0);
        group.setPopularityScore(score);
        if (group.getPrivacy() == GroupPrivacy.PUBLIC) {
            groupRankingService.updateGroupScore(group.getId(), score);
        }
    }

    public GroupSummaryDto mapToSummaryDto(ChatGroup group, User currentUser) {
        GroupRole currentRole = null;
        GroupMemberStatus currentStatus = null;
        Instant mutedUntil = null;
        boolean isMember = false;
        boolean hasPendingRequest = false;

        if (currentUser != null) {
            Optional<GroupMember> memberOpt = groupMemberRepository.findByGroupIdAndUserId(group.getId(), currentUser.getId());
            if (memberOpt.isPresent()) {
                currentRole = memberOpt.get().getRole();
                currentStatus = memberOpt.get().getStatus();
                mutedUntil = memberOpt.get().getMutedUntil();
                isMember = (currentStatus == GroupMemberStatus.ACTIVE || currentStatus == GroupMemberStatus.MUTED);
            } else {
                hasPendingRequest = groupJoinRequestRepository.existsByGroupIdAndUserIdAndStatus(group.getId(), currentUser.getId(), JoinRequestStatus.PENDING);
            }
        }

        return GroupSummaryDto.builder()
                .id(group.getId())
                .name(group.getName())
                .slug(group.getSlug())
                .description(group.getDescription())
                .avatarUrl(group.getAvatarUrl())
                .coverUrl(group.getCoverUrl())
                .privacy(group.getPrivacy())
                .joinPolicy(group.getJoinPolicy())
                .maxMembers(group.getMaxMembers())
                .memberCount(group.getMemberCount())
                .messageCount(group.getMessageCount())
                .popularityScore(group.getPopularityScore())
                .owner(mapToUserSummaryDto(group.getOwner()))
                .currentUserRole(currentRole)
                .currentUserStatus(currentStatus)
                .currentUserMutedUntil(mutedUntil)
                .isMember(isMember)
                .hasPendingRequest(hasPendingRequest)
                .isArchived(group.getIsArchived())
                .deletedAt(group.getDeletedAt())
                .createdAt(group.getCreatedAt())
                .build();
    }

    public GroupMemberDto mapToMemberDto(GroupMember member) {
        return GroupMemberDto.builder()
                .id(member.getId())
                .groupId(member.getGroup().getId())
                .user(mapToUserSummaryDto(member.getUser()))
                .role(member.getRole())
                .status(member.getStatus())
                .mutedUntil(member.getMutedUntil())
                .joinedAt(member.getJoinedAt())
                .build();
    }

    public GroupJoinRequestDto mapToJoinRequestDto(GroupJoinRequest req) {
        return GroupJoinRequestDto.builder()
                .id(req.getId())
                .groupId(req.getGroup().getId())
                .groupName(req.getGroup().getName())
                .user(mapToUserSummaryDto(req.getUser()))
                .status(req.getStatus())
                .requestMessage(req.getRequestMessage())
                .viaInviteLink(req.getViaInviteLink())
                .reviewedBy(req.getReviewedBy() != null ? mapToUserSummaryDto(req.getReviewedBy()) : null)
                .reviewedAt(req.getReviewedAt())
                .createdAt(req.getCreatedAt())
                .build();
    }

    public GroupInviteLinkDto mapToInviteLinkDto(GroupInviteLink link) {
        return GroupInviteLinkDto.builder()
                .id(link.getId())
                .groupId(link.getGroup().getId())
                .code(link.getCode())
                .inviteUrl("/join/" + link.getCode())
                .createdBy(mapToUserSummaryDto(link.getCreatedBy()))
                .maxUses(link.getMaxUses())
                .usedCount(link.getUsedCount())
                .expiresAt(link.getExpiresAt())
                .isRevoked(link.getIsRevoked())
                .isValid(link.isValid())
                .createdAt(link.getCreatedAt())
                .build();
    }

    public GroupPinnedMessageDto mapToPinnedDto(GroupPinnedMessage pm) {
        return GroupPinnedMessageDto.builder()
                .id(pm.getId())
                .messageId(pm.getMessage().getId())
                .messageContent(pm.getMessage().getContent())
                .messageType(pm.getMessage().getMessageType().name())
                .sender(mapToUserSummaryDto(pm.getMessage().getSender()))
                .pinnedBy(mapToUserSummaryDto(pm.getPinnedBy()))
                .messageCreatedAt(pm.getMessage().getCreatedAt())
                .pinnedAt(pm.getPinnedAt())
                .build();
    }

    public UserSummaryDto mapToUserSummaryDto(User user) {
        if (user == null) return null;
        boolean isOnline = user.getLastActiveAt() != null && user.getLastActiveAt().isAfter(Instant.now().minusSeconds(300));
        return UserSummaryDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName() != null ? user.getDisplayName() : user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .selectedTitle(user.getSelectedTitle())
                .currentLevel(user.getCurrentLevel())
                .totalXp(user.getTotalXp())
                .isOnline(isOnline)
                .build();
    }

    private String toSlug(String input) {
        if (input == null) return "";
        String nowhitespace = WHITESPACE.matcher(input.trim().toLowerCase()).replaceAll("-");
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = NONLATIN.matcher(normalized).replaceAll("");
        return slug.replaceAll("-+", "-").replaceAll("^-|-$", "");
    }

    // ==================== ADMIN GROUP MANAGEMENT ====================

    @Transactional(readOnly = true)
    public List<GroupSummaryDto> getAllGroupsForAdmin(String search, Boolean isArchived) {
        List<ChatGroup> allGroups = chatGroupRepository.findAll();
        return allGroups.stream()
                .filter(g -> {
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase();
                        boolean matchName = g.getName() != null && g.getName().toLowerCase().contains(s);
                        boolean matchSlug = g.getSlug() != null && g.getSlug().toLowerCase().contains(s);
                        boolean matchOwner = g.getOwner() != null && (
                                (g.getOwner().getDisplayName() != null && g.getOwner().getDisplayName().toLowerCase().contains(s)) ||
                                (g.getOwner().getEmail() != null && g.getOwner().getEmail().toLowerCase().contains(s))
                        );
                        if (!matchName && !matchSlug && !matchOwner) return false;
                    }
                    if (isArchived != null) {
                        if (!Boolean.valueOf(Boolean.TRUE.equals(g.getIsArchived())).equals(isArchived)) return false;
                    }
                    return true;
                })
                .sorted((a, b) -> {
                    Instant aTime = a.getCreatedAt() != null ? a.getCreatedAt() : Instant.EPOCH;
                    Instant bTime = b.getCreatedAt() != null ? b.getCreatedAt() : Instant.EPOCH;
                    return bTime.compareTo(aTime);
                })
                .map(g -> mapToSummaryDto(g, null))
                .collect(Collectors.toList());
    }

    @Transactional
    public GroupSummaryDto adminUpdateGroup(UUID groupId, UpdateGroupRequest request) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Nhóm không tồn tại: " + groupId));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            group.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            group.setDescription(request.getDescription().trim());
        }
        if (request.getPrivacy() != null) {
            group.setPrivacy(request.getPrivacy());
            if (request.getPrivacy() == GroupPrivacy.PRIVATE) {
                groupRankingService.removeGroup(groupId);
            } else {
                groupRankingService.updateGroupScore(groupId, group.getPopularityScore());
            }
        }
        if (request.getJoinPolicy() != null) {
            group.setJoinPolicy(request.getJoinPolicy());
        }
        if (request.getAvatarUrl() != null) {
            group.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getCoverUrl() != null) {
            group.setCoverUrl(request.getCoverUrl());
        }
        if (request.getMaxMembers() != null && request.getMaxMembers() > 0) {
            group.setMaxMembers(request.getMaxMembers());
        }

        ChatGroup saved = chatGroupRepository.save(group);
        log.info("Admin updated group [{}] ({})", saved.getName(), saved.getId());
        return mapToSummaryDto(saved, null);
    }

    @Transactional
    public GroupSummaryDto adminArchiveGroup(UUID groupId, boolean isArchived) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Nhóm không tồn tại: " + groupId));

        group.setIsArchived(isArchived);
        if (isArchived) {
            groupRankingService.removeGroup(groupId);
        } else if (group.getPrivacy() == GroupPrivacy.PUBLIC) {
            groupRankingService.updateGroupScore(groupId, group.getPopularityScore());
        }

        ChatGroup saved = chatGroupRepository.save(group);
        log.info("Admin {} group [{}] ({})", isArchived ? "archived" : "unarchived", saved.getName(), saved.getId());
        return mapToSummaryDto(saved, null);
    }

    @Transactional
    public void adminDeleteGroup(UUID groupId) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Nhóm không tồn tại: " + groupId));

        groupRankingService.removeGroup(groupId);
        chatGroupRepository.delete(group);
        log.info("Admin permanently deleted group [{}] ({})", group.getName(), groupId);
    }
}
