package com.studytracker.service;

import com.studytracker.dto.MessageDto;
import com.studytracker.dto.OnlineUserResponse;
import com.studytracker.model.Message;
import com.studytracker.model.User;
import com.studytracker.repository.MessageRepository;
import com.studytracker.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class VirtualUserService {

    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.virtual-users.enabled:true}")
    private boolean enabled;

    @Value("${app.virtual-users.count:8}")
    private int virtualUserCount;

    @Value("${app.virtual-users.rotation-hours:2}")
    private int rotationHours;

    @Value("${app.virtual-users.auto-reply-enabled:false}")
    private boolean autoReplyEnabled;

    private static final List<String> NAMES = Arrays.asList(
            "Minh Triết", "Thu Hà", "Đức Anh", "Linh Chi", "Hoàng Nam", "Gia Hân",
            "Bảo Long", "Phương Thảo", "Thành Vinh", "Quỳnh Trang", "Quang Huy", "Tú Anh",
            "Hải Đăng", "Khánh Linh", "Việt Hoàng", "Thùy Dương", "Nhật Minh", "Hà Phương",
            "Đăng Khoa", "Mỹ Duyên", "Anh Dũng", "Ngọc Mai", "Tuấn Kiệt", "Bảo Ngọc",
            "Trọng Hiếu", "Minh Thư", "Khánh An", "Yến Nhi", "Hồng Phúc", "Thanh Tùng",
            "Hoài An", "Gia Bảo", "Khánh Vy", "Đăng Dương", "Diệu Linh", "Bảo An",
            "Văn Nam", "Ngọc Hân", "Tiến Dũng", "Thảo Nguyên"
    );

    private static final List<String> TITLES = Arrays.asList(
            "Tân Binh Tập Trung", "Học Giả Bền Bỉ", "Chiến Binh Pomodoro", "Bậc Thầy Tập Trung", "Đại Sứ Học Thuật"
    );

    @Data
    public static class StudyAction {
        private final String subject;
        private final String actionDetail;
    }

    private static final List<StudyAction> ACTIONS = Arrays.asList(
            new StudyAction("Toán Cao Cấp", "Đang giải 5 bài tập Tích Phân"),
            new StudyAction("IELTS Reading & Listening", "Đang luyện đề Cambridge 18"),
            new StudyAction("Lập trình Java & Spring Boot", "Đang debug REST API & Hibernate"),
            new StudyAction("Vật Lý Đại Cương", "Đang tóm tắt công thức Cơ học"),
            new StudyAction("Tiếng Nhật N3", "Đang ôn 20 từ vựng Kanji"),
            new StudyAction("Data Structures & Algorithms", "Đang giải bài tập LeetCode"),
            new StudyAction("Tiếng Anh Giao Tiếp", "Đang nghe podcast Shadowing"),
            new StudyAction("Hóa Học Hữu Cơ", "Đang vẽ sơ đồ phản ứng"),
            new StudyAction("Kinh Tế Vĩ Mô", "Đang đọc giáo trình chương 4"),
            new StudyAction("Triết Học Mác - Lênin", "Đang chuẩn bị slide thuyết trình"),
            new StudyAction("Tiếng Trung HSK 4", "Đang luyện phát âm Pinyin"),
            new StudyAction("Lập trình Web Frontend", "Đang thiết kế UI bằng Tailwind CSS")
    );

    private static final List<String> AUTO_REPLY_TEMPLATES = Arrays.asList(
            "Cảm ơn bạn nha! Mình cũng đang tập trung học %s, chúc bạn cày XP vui vẻ và đạt mục tiêu hôm nay nhé!",
            "Hé lố bạn! Mình đang tập trung làm nốt bài tập nè. Cùng cố gắng giữ streak học tập nha!",
            "Chào bạn nha, thấy bạn cũng đang online học nè! Cùng nhau cố gắng học thật tốt nhé.",
            "Ôi chào bạn! Rất vui được gặp bạn trong phòng học. Cùng nhau cố gắng không bỏ cuộc nhé!",
            "Hi bạn! Mình đang áp dụng phương pháp Pomodoro 25p, lát nữa giải lao mình trò chuyện tiếp nha!"
    );

    @PostConstruct
    @Transactional
    public void initVirtualUsers() {
        if (!enabled) return;
        refreshVirtualUsersInDb();
    }

    /**
     * Tự động cập nhật / làm mới danh sách người dùng ảo theo chu kỳ xoay chuyển (mỗi giờ kiểm tra và xoay theo rotationHours).
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void scheduledRefresh() {
        if (!enabled) return;
        log.info("Thực hiện làm mới danh sách người dùng ảo theo chu kỳ {} giờ...", rotationHours);
        refreshVirtualUsersInDb();
    }

    @Transactional
    public void refreshVirtualUsersInDb() {
        if (!enabled) return;

        long rotationSeconds = Math.max(1, rotationHours) * 3600L;
        long timeSlot = Instant.now().getEpochSecond() / rotationSeconds;
        int count = Math.max(1, virtualUserCount);

        for (int i = 0; i < count; i++) {
            String botEmail = "virtual.bot." + i + "@studytracker.internal";

            int nameIdx = (int) Math.abs((timeSlot * 17 + i * 31) % NAMES.size());
            int titleIdx = (int) Math.abs((timeSlot * 7 + i * 11) % TITLES.size());
            int level = 3 + (int) Math.abs((timeSlot * 3 + i * 5) % 15);

            String displayName = NAMES.get(nameIdx);
            String title = TITLES.get(titleIdx);
            String avatarUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=virtual_bot_" + i + "_" + timeSlot;

            User bot = userRepository.findByEmail(botEmail).orElseGet(() -> {
                User newBot = User.builder()
                        .email(botEmail)
                        .passwordHash("N/A_VIRTUAL_BOT_NO_LOGIN")
                        .displayName(displayName)
                        .avatarUrl(avatarUrl)
                        .selectedTitle(title)
                        .currentLevel(level)
                        .currentXp(150)
                        .totalXp(level * 600L)
                        .enabled(true)
                        .isVirtual(true)
                        .build();
                return userRepository.save(newBot);
            });

            bot.setDisplayName(displayName);
            bot.setAvatarUrl(avatarUrl);
            bot.setSelectedTitle(title);
            bot.setCurrentLevel(level);
            bot.setTotalXp(level * 600L);
            bot.setIsVirtual(true);
            bot.setEnabled(true);
            bot.setLastActiveAt(Instant.now());

            userRepository.save(bot);
        }
    }

    /**
     * Lấy danh sách response người dùng ảo cho API getOnlineUsers
     */
    public List<OnlineUserResponse> getVirtualOnlineResponses() {
        if (!enabled) {
            return Collections.emptyList();
        }

        long rotationSeconds = Math.max(1, rotationHours) * 3600L;
        long timeSlot = Instant.now().getEpochSecond() / rotationSeconds;
        int count = Math.max(1, virtualUserCount);
        List<OnlineUserResponse> responses = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            String botEmail = "virtual.bot." + i + "@studytracker.internal";
            Optional<User> botOpt = userRepository.findByEmail(botEmail);
            if (botOpt.isEmpty()) continue;

            User bot = botOpt.get();

            int actionIdx = (int) Math.abs((timeSlot * 13 + i * 19) % ACTIONS.size());
            StudyAction action = ACTIONS.get(actionIdx);

            // Giả lập thời gian bắt đầu học từ 5-50 phút trước
            int minutesAgo = 5 + (int) Math.abs((timeSlot * 11 + i * 23) % 45);
            Instant studyStartedAt = Instant.now().minusSeconds(minutesAgo * 60L);

            responses.add(OnlineUserResponse.builder()
                    .userId(bot.getId())
                    .displayName(bot.getDisplayName())
                    .avatarUrl(bot.getAvatarUrl())
                    .selectedTitle(bot.getSelectedTitle())
                    .lastActiveAt(Instant.now())
                    .isStudying(true)
                    .currentSubject(action.getSubject())
                    .actionDetail(action.getActionDetail())
                    .studyStartedAt(studyStartedAt)
                    .baseLevel(bot.getCurrentLevel())
                    .currentLevel(bot.getCurrentLevel())
                    .currentXp(bot.getCurrentXp())
                    .isVirtual(true)
                    .build());
        }

        return responses;
    }

    /**
     * Tự động phản hồi tin nhắn khi người dùng nhắn tin cho bot ảo
     */
    @Async
    public void scheduleAutoReply(User sender, User virtualBot, String userContent) {
        if (!enabled || !autoReplyEnabled) return;

        try {
            // Giả lập thời gian phản hồi tự nhiên (2 giây)
            Thread.sleep(2000);

            long rotationSeconds = Math.max(1, rotationHours) * 3600L;
            long timeSlot = Instant.now().getEpochSecond() / rotationSeconds;
            int count = Math.max(1, virtualUserCount);
            int botIndex = Math.abs(virtualBot.getEmail().hashCode()) % count;
            int actionIdx = (int) Math.abs((timeSlot * 13 + botIndex * 19) % ACTIONS.size());
            StudyAction action = ACTIONS.get(actionIdx);

            String replyContent;
            String lowerContent = userContent.toLowerCase();

            if (lowerContent.contains("chào") || lowerContent.contains("hi") || lowerContent.contains("hello")) {
                replyContent = String.format("Chào bạn %s nha! Mấy nay học hành thế nào rồi? Cùng cố gắng nhé!",
                        sender.getDisplayName() != null ? sender.getDisplayName() : "bạn");
            } else {
                int templateIdx = (int) (Math.abs(System.currentTimeMillis() + botIndex) % AUTO_REPLY_TEMPLATES.size());
                String rawTemplate = AUTO_REPLY_TEMPLATES.get(templateIdx);
                if (rawTemplate.contains("%s")) {
                    replyContent = String.format(rawTemplate, action.getSubject());
                } else {
                    replyContent = rawTemplate;
                }
            }

            Message autoMessage = Message.builder()
                    .sender(virtualBot)
                    .recipient(sender)
                    .content(replyContent)
                    .isRead(false)
                    .build();

            Message saved = messageRepository.save(autoMessage);

            MessageDto recipientDto = MessageDto.builder()
                    .id(saved.getId())
                    .senderId(virtualBot.getId())
                    .senderName(virtualBot.getDisplayName())
                    .senderAvatar(virtualBot.getAvatarUrl())
                    .recipientId(sender.getId())
                    .recipientName(sender.getDisplayName())
                    .recipientAvatar(sender.getAvatarUrl())
                    .content(saved.getContent())
                    .isRead(false)
                    .createdAt(saved.getCreatedAt())
                    .isMine(false)
                    .build();

            messagingTemplate.convertAndSendToUser(
                    sender.getId().toString(),
                    "/queue/messages",
                    recipientDto
            );
        } catch (Exception e) {
            log.error("Lỗi khi gửi tự động phản hồi bot ảo: {}", e.getMessage(), e);
        }
    }
}
