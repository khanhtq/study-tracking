package com.studytracker.service;

import com.studytracker.dto.AvailableCountdownDto;
import com.studytracker.dto.GroupCountdownDto;
import com.studytracker.dto.GroupMessageDto;
import com.studytracker.dto.LinkCountdownRequest;
import com.studytracker.dto.UserSummaryDto;
import com.studytracker.model.*;
import com.studytracker.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupCountdownService {

    private final GroupCountdownLinkRepository groupCountdownLinkRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final SystemPresetExamRepository systemPresetExamRepository;
    private final CountdownEventRepository countdownEventRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional(readOnly = true)
    public List<GroupCountdownDto> getGroupCountdowns(UUID groupId, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        // Kiểm tra quyền: nếu nhóm PRIVATE thì user phải là thành viên
        if (group.getPrivacy() == GroupPrivacy.PRIVATE && currentUser != null) {
            boolean isMember = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId())
                    .map(m -> m.getStatus() == GroupMemberStatus.ACTIVE)
                    .orElse(false);
            if (!isMember && currentUser.getRole() != Role.ROLE_ADMIN) {
                throw new SecurityException("Bạn không có quyền xem thông tin nhóm riêng tư này");
            }
        }

        List<GroupCountdownLink> links = groupCountdownLinkRepository.findByGroupIdWithDetails(groupId);
        Instant now = Instant.now();

        return links.stream()
                .map(link -> mapToGroupCountdownDto(link, now))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(GroupCountdownDto::getTargetDate))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AvailableCountdownDto> getAvailableCountdowns(UUID groupId, User currentUser) {
        if (groupId != null) {
            validateOwnerOrAdmin(groupId, currentUser);
        }

        Instant now = Instant.now();
        List<GroupCountdownLink> existingLinks = groupId != null
                ? groupCountdownLinkRepository.findByGroupIdWithDetails(groupId)
                : Collections.emptyList();
        Set<Long> linkedPresetIds = existingLinks.stream()
                .map(l -> l.getPresetExam() != null ? l.getPresetExam().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<UUID> linkedCustomIds = existingLinks.stream()
                .map(l -> l.getCustomCountdown() != null ? l.getCustomCountdown().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<AvailableCountdownDto> result = new ArrayList<>();

        // 1. System Presets
        List<SystemPresetExam> presets = systemPresetExamRepository.findAll();
        Set<String> presetCodes = new HashSet<>();
        for (SystemPresetExam preset : presets) {
            if (preset.getExamCode() != null) {
                presetCodes.add(preset.getExamCode());
            }
            if (preset.getTargetDate().isAfter(now)) {
                long days = calculateDaysRemaining(preset.getTargetDate(), now);
                result.add(AvailableCountdownDto.builder()
                        .presetExamId(preset.getId())
                        .customCountdownId(null)
                        .title(preset.getTitle())
                        .category(preset.getCategory())
                        .color(preset.getColor())
                        .icon("calendar")
                        .targetDate(preset.getTargetDate())
                        .daysRemaining(days)
                        .isPreset(true)
                        .isOfficialDate(Boolean.TRUE.equals(preset.getIsOfficialDate()))
                        .isAlreadyLinked(linkedPresetIds.contains(preset.getId()))
                        .build());
            }
        }

        // 2. User's Own Countdown Events (Loại trừ các event chỉ là tracking theo kỳ thi hệ thống để không bị trùng lặp)
        List<CountdownEvent> userEvents = countdownEventRepository.findByUserIdAndTargetDateAfterOrderByTargetDateAsc(currentUser.getId(), now);
        for (CountdownEvent event : userEvents) {
            if (event.getPresetExamCode() != null && presetCodes.contains(event.getPresetExamCode())) {
                continue;
            }
            if (event.getTargetDate().isAfter(now)) {
                long days = calculateDaysRemaining(event.getTargetDate(), now);
                result.add(AvailableCountdownDto.builder()
                        .presetExamId(null)
                        .customCountdownId(event.getId())
                        .title(event.getTitle())
                        .category(event.getCategory())
                        .color(event.getColor())
                        .icon(event.getIcon())
                        .targetDate(event.getTargetDate())
                        .daysRemaining(days)
                        .isPreset(false)
                        .isOfficialDate(false)
                        .isAlreadyLinked(linkedCustomIds.contains(event.getId()))
                        .build());
            }
        }

        result.sort(Comparator.comparing(AvailableCountdownDto::getTargetDate));
        return result;
    }

    @Transactional
    public GroupCountdownDto linkCountdown(UUID groupId, LinkCountdownRequest request, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        validateOwnerOrAdmin(groupId, currentUser);

        if (request.getPresetExamId() == null && (request.getPresetExamCode() == null || request.getPresetExamCode().isBlank()) && request.getCustomCountdownId() == null) {
            throw new IllegalArgumentException("Vui lòng chọn sự kiện đếm ngược cần liên kết");
        }

        Instant now = Instant.now();
        GroupCountdownLink link;
        String eventTitle;
        long daysRemaining;

        User managedUser = userRepository.findById(currentUser.getId()).orElse(currentUser);

        if (request.getPresetExamId() != null || (request.getPresetExamCode() != null && !request.getPresetExamCode().isBlank())) {
            SystemPresetExam preset;
            if (request.getPresetExamId() != null) {
                preset = systemPresetExamRepository.findById(request.getPresetExamId())
                        .orElseThrow(() -> new IllegalArgumentException("Kỳ thi hệ thống không tồn tại"));
            } else {
                preset = systemPresetExamRepository.findByExamCode(request.getPresetExamCode().trim())
                        .orElseThrow(() -> new IllegalArgumentException("Kỳ thi hệ thống không tồn tại"));
            }

            if (preset.getTargetDate().isBefore(now)) {
                throw new IllegalArgumentException("Kỳ thi này đã kết thúc, không thể liên kết");
            }
            if (groupCountdownLinkRepository.findByGroupIdAndPresetExamId(groupId, preset.getId()).isPresent()) {
                throw new IllegalArgumentException("Kỳ thi này đã được liên kết với nhóm rồi");
            }

            link = GroupCountdownLink.builder()
                    .group(group)
                    .presetExam(preset)
                    .customCountdown(null)
                    .createdBy(managedUser)
                    .build();
            eventTitle = preset.getTitle();
            daysRemaining = calculateDaysRemaining(preset.getTargetDate(), now);
        } else {
            CountdownEvent event = countdownEventRepository.findById(request.getCustomCountdownId())
                    .orElseThrow(() -> new IllegalArgumentException("Sự kiện đếm ngược không tồn tại"));
            if (event.getTargetDate().isBefore(now)) {
                throw new IllegalArgumentException("Sự kiện này đã kết thúc, không thể liên kết");
            }
            if (groupCountdownLinkRepository.findByGroupIdAndCustomCountdownId(groupId, event.getId()).isPresent()) {
                throw new IllegalArgumentException("Sự kiện này đã được liên kết với nhóm rồi");
            }

            link = GroupCountdownLink.builder()
                    .group(group)
                    .presetExam(null)
                    .customCountdown(event)
                    .createdBy(managedUser)
                    .build();
            eventTitle = event.getTitle();
            daysRemaining = calculateDaysRemaining(event.getTargetDate(), now);
        }

        GroupCountdownLink saved = groupCountdownLinkRepository.save(link);
        log.info("User [{}] linked countdown [{}] to group [{}]", managedUser.getEmail(), eventTitle, group.getName());

        // Bắn tin nhắn thông báo vào phòng chat
        String actorName = managedUser.getDisplayName() != null ? managedUser.getDisplayName() : managedUser.getEmail();
        String announcement = String.format("%s đã liên kết mục tiêu đếm ngược %s (còn %d ngày) vào nhóm học tập.", actorName, eventTitle, daysRemaining);
        broadcastSystemMessage(group, managedUser, announcement);

        return mapToGroupCountdownDto(saved, now);
    }

    @Transactional
    public void unlinkCountdown(UUID groupId, UUID linkId, User currentUser) {
        ChatGroup group = getGroupEntity(groupId);
        validateOwnerOrAdmin(groupId, currentUser);

        GroupCountdownLink link = groupCountdownLinkRepository.findById(linkId)
                .orElseThrow(() -> new IllegalArgumentException("Liên kết sự kiện không tồn tại"));

        if (!link.getGroup().getId().equals(groupId)) {
            throw new IllegalArgumentException("Liên kết không thuộc nhóm này");
        }

        String eventTitle = link.getPresetExam() != null ? link.getPresetExam().getTitle()
                : (link.getCustomCountdown() != null ? link.getCustomCountdown().getTitle() : "Sự kiện");

        groupCountdownLinkRepository.delete(link);
        log.info("User [{}] unlinked countdown [{}] from group [{}]", currentUser.getUsername(), eventTitle, group.getName());

        // Bắn tin nhắn thông báo hủy liên kết vào nhóm
        String actorName = currentUser.getDisplayName() != null ? currentUser.getDisplayName() : currentUser.getUsername();
        String announcement = String.format("%s đã hủy liên kết mục tiêu đếm ngược %s khỏi nhóm.", actorName, eventTitle);
        broadcastSystemMessage(group, currentUser, announcement);
    }

    @Transactional
    public void processDailyCountdownBroadcast() {
        log.info("Bắt đầu quét và phát bản tin đếm ngược hàng ngày cho các nhóm chat...");
        List<GroupCountdownLink> allLinks = groupCountdownLinkRepository.findAllActiveLinksWithDetails();
        if (allLinks.isEmpty()) {
            log.info("Không có liên kết đếm ngược nào đang hoạt động.");
            return;
        }

        Instant now = Instant.now();
        LocalDate todayVn = LocalDate.ofInstant(now, VN_ZONE);

        // Gom nhóm theo ChatGroup
        Map<ChatGroup, List<GroupCountdownLink>> groupLinksMap = allLinks.stream()
                .collect(Collectors.groupingBy(GroupCountdownLink::getGroup));

        int sentCount = 0;
        for (Map.Entry<ChatGroup, List<GroupCountdownLink>> entry : groupLinksMap.entrySet()) {
            ChatGroup group = entry.getKey();
            List<GroupCountdownLink> links = entry.getValue();

            // Lọc các sự kiện chưa hết hạn
            List<GroupCountdownDto> activeCountdowns = links.stream()
                    .map(l -> mapToGroupCountdownDto(l, now))
                    .filter(Objects::nonNull)
                    .filter(c -> c.getDaysRemaining() >= 0)
                    .sorted(Comparator.comparing(GroupCountdownDto::getTargetDate))
                    .toList();

            if (activeCountdowns.isEmpty()) {
                continue;
            }

            // Kiểm tra xem nhóm đã nhận tin thông báo trong ngày hôm nay chưa
            boolean alreadyNotifiedToday = links.stream().anyMatch(l -> {
                if (l.getLastDailyNotifiedAt() == null) return false;
                LocalDate lastDate = LocalDate.ofInstant(l.getLastDailyNotifiedAt(), VN_ZONE);
                return lastDate.isEqual(todayVn);
            });

            if (alreadyNotifiedToday) {
                continue;
            }

            // Xây dựng nội dung tin nhắn bản tin đếm ngược
            StringBuilder sb = new StringBuilder();
            sb.append("[BẢN TIN ĐẾM NGƯỢC HÔM NAY]\n");
            sb.append("Mục tiêu học tập sắp tới của nhóm:\n\n");

            for (GroupCountdownDto cd : activeCountdowns) {
                LocalDate targetLocal = LocalDate.ofInstant(cd.getTargetDate(), VN_ZONE);
                String formattedDate = targetLocal.format(DATE_FORMATTER);
                if (cd.getDaysRemaining() == 0) {
                    sb.append(String.format("• %s: Hôm nay là ngày thi/sự kiện chính thức!\n", cd.getTitle()));
                } else if (cd.getDaysRemaining() == 1) {
                    sb.append(String.format("• %s: Còn 1 ngày nữa (%s)\n", cd.getTitle(), formattedDate));
                } else {
                    sb.append(String.format("• %s: Còn %d ngày (%s)\n", cd.getTitle(), cd.getDaysRemaining(), formattedDate));
                }
            }

            sb.append("\nChúc cả nhóm có một ngày học tập tập trung và hiệu quả!");

            // Lưu tin nhắn và phát STOMP
            User sender = group.getOwner();
            broadcastSystemMessage(group, sender, sb.toString());

            // Cập nhật timestamp
            for (GroupCountdownLink l : links) {
                l.setLastDailyNotifiedAt(now);
                groupCountdownLinkRepository.save(l);
            }
            sentCount++;
        }

        log.info("Hoàn tất phát bản tin đếm ngược hàng ngày tới {} nhóm học tập.", sentCount);
    }

    private void broadcastSystemMessage(ChatGroup group, User sender, String content) {
        GroupMessage systemMsg = GroupMessage.builder()
                .group(group)
                .sender(sender)
                .messageType(GroupMessageType.SYSTEM)
                .content(content)
                .hasMentions(false)
                .isEdited(false)
                .isDeleted(false)
                .isPinned(false)
                .build();
        GroupMessage saved = groupMessageRepository.save(systemMsg);

        GroupMessageDto dto = GroupMessageDto.builder()
                .id(saved.getId())
                .groupId(group.getId())
                .sender(mapToUserSummaryDto(sender))
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

        messagingTemplate.convertAndSend("/topic/group." + group.getId() + ".messages", dto);
    }

    private long calculateDaysRemaining(Instant targetDate, Instant now) {
        LocalDate today = LocalDate.ofInstant(now, VN_ZONE);
        LocalDate target = LocalDate.ofInstant(targetDate, VN_ZONE);
        return ChronoUnit.DAYS.between(today, target);
    }

    private GroupCountdownDto mapToGroupCountdownDto(GroupCountdownLink link, Instant now) {
        if (link.getPresetExam() != null) {
            SystemPresetExam preset = link.getPresetExam();
            long days = calculateDaysRemaining(preset.getTargetDate(), now);
            return GroupCountdownDto.builder()
                    .linkId(link.getId())
                    .groupId(link.getGroup().getId())
                    .presetExamId(preset.getId())
                    .customCountdownId(null)
                    .title(preset.getTitle())
                    .category(preset.getCategory())
                    .color(preset.getColor())
                    .icon("calendar")
                    .targetDate(preset.getTargetDate())
                    .daysRemaining(days)
                    .isPreset(true)
                    .isOfficialDate(Boolean.TRUE.equals(preset.getIsOfficialDate()))
                    .note(preset.getDescription())
                    .createdAt(link.getCreatedAt())
                    .build();
        } else if (link.getCustomCountdown() != null) {
            CountdownEvent event = link.getCustomCountdown();
            long days = calculateDaysRemaining(event.getTargetDate(), now);
            return GroupCountdownDto.builder()
                    .linkId(link.getId())
                    .groupId(link.getGroup().getId())
                    .presetExamId(null)
                    .customCountdownId(event.getId())
                    .title(event.getTitle())
                    .category(event.getCategory())
                    .color(event.getColor())
                    .icon(event.getIcon())
                    .targetDate(event.getTargetDate())
                    .daysRemaining(days)
                    .isPreset(false)
                    .isOfficialDate(false)
                    .note(event.getNote())
                    .createdAt(link.getCreatedAt())
                    .build();
        }
        return null;
    }

    private void validateOwnerOrAdmin(UUID groupId, User currentUser) {
        if (currentUser.getRole() == Role.ROLE_ADMIN) {
            return;
        }
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId())
                .orElseThrow(() -> new SecurityException("Bạn không phải thành viên của nhóm"));

        if (member.getStatus() != GroupMemberStatus.ACTIVE || (member.getRole() != GroupRole.OWNER && member.getRole() != GroupRole.ADMIN)) {
            throw new SecurityException("Chỉ Trưởng nhóm hoặc Quản trị viên nhóm mới có quyền quản lý sự kiện đếm ngược");
        }
    }

    private ChatGroup getGroupEntity(UUID groupId) {
        return chatGroupRepository.findById(groupId)
                .filter(g -> g.getDeletedAt() == null)
                .orElseThrow(() -> new IllegalArgumentException("Nhóm không tồn tại hoặc đã bị xóa: " + groupId));
    }

    private UserSummaryDto mapToUserSummaryDto(User user) {
        if (user == null) return null;
        return UserSummaryDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }
}
