package com.studytracker.service;

import com.studytracker.dto.FriendDto;
import com.studytracker.dto.FriendshipStatusDto;
import com.studytracker.model.*;
import com.studytracker.repository.FriendshipRepository;
import com.studytracker.repository.StudySessionRepository;
import com.studytracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final StudySessionRepository studySessionRepository;
    private final XpService xpService;
    private final PaymentService paymentService;

    public boolean shouldShowActivityStatus(User targetUser, User viewer) {
        if (viewer != null && viewer.getId().equals(targetUser.getId())) {
            return true;
        }
        ActivityStatusVisibility visibility = targetUser.getActivityStatusVisibility();
        if (visibility == null || visibility == ActivityStatusVisibility.EVERYONE) {
            return true;
        }
        if (visibility == ActivityStatusVisibility.NOBODY) {
            return false;
        }
        if (visibility == ActivityStatusVisibility.FRIENDS_ONLY) {
            return viewer != null && friendshipRepository.isFriends(targetUser.getId(), viewer.getId());
        }
        return false;
    }

    @Transactional
    public FriendshipStatusDto sendFriendRequest(User currentUser, UUID targetUserId) {
        if (currentUser.getId().equals(targetUserId)) {
            throw new IllegalArgumentException("Không thể gửi lời mời kết bạn cho chính mình.");
        }

        User requester = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản người gửi."));

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));

        if (requester.getRole() == com.studytracker.model.Role.ROLE_ADMIN || targetUser.getRole() == com.studytracker.model.Role.ROLE_ADMIN) {
            throw new IllegalArgumentException("Tài khoản Quản trị viên không gửi hoặc nhận lời mời kết bạn.");
        }

        Optional<Friendship> existingOpt = friendshipRepository.findBetweenUserIds(currentUser.getId(), targetUserId);

        if (existingOpt.isPresent()) {
            Friendship existing = existingOpt.get();
            if (existing.getStatus() == FriendshipStatus.ACCEPTED) {
                throw new IllegalArgumentException("Bạn và người dùng này đã là bạn bè.");
            }
            if (existing.getStatus() == FriendshipStatus.PENDING) {
                if (existing.getRequester().getId().equals(currentUser.getId())) {
                    throw new IllegalArgumentException("Bạn đã gửi lời mời kết bạn trước đó.");
                } else {
                    // Reverse request -> Auto-accept!
                    existing.setStatus(FriendshipStatus.ACCEPTED);
                    Friendship saved = friendshipRepository.save(existing);
                    return FriendshipStatusDto.builder()
                            .status("FRIENDS")
                            .friendshipId(saved.getId())
                            .build();
                }
            }
            // If DECLINED or BLOCKED -> update to PENDING
            existing.setRequester(requester);
            existing.setAddressee(targetUser);
            existing.setStatus(FriendshipStatus.PENDING);
            Friendship saved = friendshipRepository.save(existing);
            return FriendshipStatusDto.builder()
                    .status("PENDING_SENT")
                    .friendshipId(saved.getId())
                    .build();
        }

        Friendship friendship = Friendship.builder()
                .requester(requester)
                .addressee(targetUser)
                .status(FriendshipStatus.PENDING)
                .build();

        Friendship saved = friendshipRepository.save(friendship);

        return FriendshipStatusDto.builder()
                .status("PENDING_SENT")
                .friendshipId(saved.getId())
                .build();
    }

    @Transactional
    public void acceptFriendRequest(User currentUser, UUID friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Lời mời kết bạn không tồn tại."));

        if (!friendship.getAddressee().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Bạn không có quyền chấp nhận lời mời này.");
        }

        friendship.setStatus(FriendshipStatus.ACCEPTED);
        friendshipRepository.save(friendship);
    }

    @Transactional
    public void declineFriendRequest(User currentUser, UUID friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Lời mời kết bạn không tồn tại."));

        if (!friendship.getAddressee().getId().equals(currentUser.getId()) &&
            !friendship.getRequester().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Bạn không có quyền từ chối/hủy lời mời này.");
        }

        friendshipRepository.delete(friendship);
    }

    @Transactional
    public void unfriend(User currentUser, UUID friendId) {
        userRepository.findById(friendId)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));

        Friendship friendship = friendshipRepository.findBetweenUserIds(currentUser.getId(), friendId)
                .orElseThrow(() -> new IllegalArgumentException("Mối quan hệ bạn bè không tồn tại."));

        friendshipRepository.delete(friendship);
    }

    @Transactional(readOnly = true)
    public List<FriendDto> getFriends(User currentUser) {
        List<Friendship> friendships = friendshipRepository.findAllByUserIdAndStatus(currentUser.getId(), FriendshipStatus.ACCEPTED);

        Instant onlineThreshold = Instant.now().minus(Duration.ofMinutes(2));

        return friendships.stream().map(f -> {
            User friend = f.getRequester().getId().equals(currentUser.getId()) ? f.getAddressee() : f.getRequester();
            boolean canSeeStatus = shouldShowActivityStatus(friend, currentUser);

            boolean isOnline = canSeeStatus && friend.getLastActiveAt() != null && friend.getLastActiveAt().isAfter(onlineThreshold);
            Instant lastActiveAt = canSeeStatus ? friend.getLastActiveAt() : null;

            boolean isStudying = false;
            String currentSubject = null;
            Instant studyStartedAt = null;

            int baseLevel = friend.getCurrentLevel() != null ? friend.getCurrentLevel() : 1;
            int realtimeLevel = baseLevel;

            if (canSeeStatus) {
                Optional<StudySession> activeSessionOpt = studySessionRepository.findByUserAndEndedAtIsNull(friend);
                if (activeSessionOpt.isPresent()) {
                    isStudying = true;
                    currentSubject = activeSessionOpt.get().getSubject();
                    studyStartedAt = activeSessionOpt.get().getStartedAt();

                    if (studyStartedAt != null) {
                        long elapsedSeconds = Math.max(0, Duration.between(studyStartedAt, Instant.now()).getSeconds());
                        int xpEarned = xpService.calculateXpEarned((int) elapsedSeconds);
                        int tempXp = (friend.getCurrentXp() != null ? friend.getCurrentXp() : 0) + xpEarned;
                        int tempLevel = baseLevel;

                        while (true) {
                            int xpRequired = xpService.getXpRequiredForNextLevel(tempLevel);
                            if (tempXp >= xpRequired) {
                                tempXp -= xpRequired;
                                tempLevel++;
                            } else {
                                break;
                            }
                        }
                        realtimeLevel = tempLevel;
                    }
                }
            }

            return FriendDto.builder()
                    .friendshipId(f.getId())
                    .userId(friend.getId())
                    .displayName(friend.getDisplayName())
                    .email(friend.getEmail())
                    .avatarUrl(friend.getAvatarUrl())
                    .selectedTitle(friend.getSelectedTitle() != null ? friend.getSelectedTitle() : "Tân Binh Tập Trung")
                    .isPremium(paymentService.isUserPremium(friend))
                    .currentLevel(realtimeLevel)
                    .totalXp(friend.getTotalXp() != null ? friend.getTotalXp() : 0L)
                    .friendshipStatus("ACCEPTED")
                    .requestCreatedAt(f.getCreatedAt())
                    .isOnline(isOnline)
                    .lastActiveAt(lastActiveAt)
                    .isStudying(isStudying)
                    .currentSubject(currentSubject)
                    .studyStartedAt(studyStartedAt)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FriendDto> getPendingRequestsReceived(User currentUser) {
        List<Friendship> friendships = friendshipRepository.findByAddresseeIdAndStatus(currentUser.getId(), FriendshipStatus.PENDING);

        return friendships.stream().map(f -> {
            User requester = f.getRequester();
            return FriendDto.builder()
                    .friendshipId(f.getId())
                    .userId(requester.getId())
                    .displayName(requester.getDisplayName())
                    .email(requester.getEmail())
                    .avatarUrl(requester.getAvatarUrl())
                    .selectedTitle(requester.getSelectedTitle() != null ? requester.getSelectedTitle() : "Tân Binh Tập Trung")
                    .isPremium(paymentService.isUserPremium(requester))
                    .currentLevel(requester.getCurrentLevel() != null ? requester.getCurrentLevel() : 1)
                    .totalXp(requester.getTotalXp() != null ? requester.getTotalXp() : 0L)
                    .friendshipStatus("PENDING_RECEIVED")
                    .requestCreatedAt(f.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FriendDto> getPendingRequestsSent(User currentUser) {
        List<Friendship> friendships = friendshipRepository.findByRequesterIdAndStatus(currentUser.getId(), FriendshipStatus.PENDING);

        return friendships.stream().map(f -> {
            User addressee = f.getAddressee();
            return FriendDto.builder()
                    .friendshipId(f.getId())
                    .userId(addressee.getId())
                    .displayName(addressee.getDisplayName())
                    .email(addressee.getEmail())
                    .avatarUrl(addressee.getAvatarUrl())
                    .selectedTitle(addressee.getSelectedTitle() != null ? addressee.getSelectedTitle() : "Tân Binh Tập Trung")
                    .isPremium(paymentService.isUserPremium(addressee))
                    .currentLevel(addressee.getCurrentLevel() != null ? addressee.getCurrentLevel() : 1)
                    .totalXp(addressee.getTotalXp() != null ? addressee.getTotalXp() : 0L)
                    .friendshipStatus("PENDING_SENT")
                    .requestCreatedAt(f.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FriendshipStatusDto getRelationStatus(User currentUser, UUID targetUserId) {
        if (currentUser.getId().equals(targetUserId)) {
            return FriendshipStatusDto.builder().status("SELF").build();
        }

        userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));

        Optional<Friendship> friendshipOpt = friendshipRepository.findBetweenUserIds(currentUser.getId(), targetUserId);

        if (friendshipOpt.isEmpty()) {
            return FriendshipStatusDto.builder().status("NONE").build();
        }

        Friendship friendship = friendshipOpt.get();
        if (friendship.getStatus() == FriendshipStatus.ACCEPTED) {
            return FriendshipStatusDto.builder()
                    .status("FRIENDS")
                    .friendshipId(friendship.getId())
                    .build();
        }

        if (friendship.getStatus() == FriendshipStatus.PENDING) {
            if (friendship.getRequester().getId().equals(currentUser.getId())) {
                return FriendshipStatusDto.builder()
                        .status("PENDING_SENT")
                        .friendshipId(friendship.getId())
                        .build();
            } else {
                return FriendshipStatusDto.builder()
                        .status("PENDING_RECEIVED")
                        .friendshipId(friendship.getId())
                        .build();
            }
        }

        return FriendshipStatusDto.builder()
                .status("NONE")
                .build();
    }

    public long getPendingRequestsCount(User currentUser) {
        return friendshipRepository.countByAddresseeIdAndStatus(currentUser.getId(), FriendshipStatus.PENDING);
    }
}
