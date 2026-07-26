package com.studytracker.service;

import com.studytracker.config.JwtTokenProvider;
import com.studytracker.dto.AuthResponse;
import com.studytracker.dto.LoginRequest;
import com.studytracker.dto.RegisterRequest;
import com.studytracker.dto.OnlineUserResponse;
import com.studytracker.dto.UserProgressResponse;
import com.studytracker.model.StudySession;
import com.studytracker.model.User;
import com.studytracker.repository.StudySessionRepository;
import com.studytracker.repository.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.studytracker.dto.ResendOtpRequest;
import com.studytracker.dto.VerifyOtpRequest;
import java.security.SecureRandom;
import java.time.temporal.ChronoUnit;

import com.studytracker.dto.UpdateProfileRequest;
import com.studytracker.dto.ChangePasswordRequest;
import com.studytracker.dto.TitleOptionDto;
import com.studytracker.dto.PublicUserProfileDto;
import com.studytracker.dto.UserSearchResponseDto;
import com.studytracker.service.storage.FileStorageProvider;
import org.springframework.web.multipart.MultipartFile;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final StudySessionRepository studySessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final XpService xpService;
    private final EmailService emailService;
    private final FileStorageProvider fileStorageProvider;
    private final com.studytracker.repository.FriendshipRepository friendshipRepository;
    private final FriendshipService friendshipService;
    private final com.studytracker.repository.MessageRepository messageRepository;

    private String generate4DigitOtp() {
        SecureRandom random = new SecureRandom();
        int code = random.nextInt(10000);
        return String.format("%04d", code);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        // Kiểm tra xem email đã tồn tại trong hệ thống hay chưa
        Optional<User> existingUserOpt = userRepository.findByEmail(email);
        if (existingUserOpt.isPresent()) {
            User existing = existingUserOpt.get();
            // Nếu tài khoản đã kích hoạt (enabled = true hoặc null cho người dùng cũ) -> Báo lỗi
            if (Boolean.TRUE.equals(existing.getEnabled()) || existing.getEnabled() == null) {
                throw new IllegalArgumentException("Email đã được đăng ký: " + email);
            }
            // Nếu tài khoản chưa kích hoạt (enabled = false) -> Xóa bản ghi cũ để đăng ký lại mới
            studySessionRepository.deleteByUser(existing);
            userRepository.delete(existing);
            userRepository.flush();
        }

        String rawOtp = generate4DigitOtp();
        Instant now = Instant.now();

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .displayName(request.getDisplayName() != null ? request.getDisplayName().trim() : "")
                .currentLevel(1)
                .currentXp(0)
                .totalXp(0L)
                .enabled(false)
                .otpCode(passwordEncoder.encode(rawOtp))
                .otpExpiresAt(now.plus(5, ChronoUnit.MINUTES))
                .lastOtpSentAt(now)
                .build();

        User savedUser = userRepository.save(user);

        // Gửi email OTP ngầm bất đồng bộ với mã thô 4 số
        emailService.sendOtpEmail(email, rawOtp);

        return AuthResponse.builder()
                .requiresVerification(true)
                .email(email)
                .displayName(savedUser.getDisplayName())
                .message("Vui lòng nhập mã OTP 4 chữ số được gửi tới email để hoàn tất đăng ký.")
                .build();
    }

    @Transactional
    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản không tồn tại hoặc đã hết hạn xác minh. Vui lòng đăng ký lại."));

        if (Boolean.TRUE.equals(user.getEnabled())) {
            // Đã kích hoạt từ trước -> trả về token luôn
            String token = jwtTokenProvider.generateToken(user.getEmail());
            return AuthResponse.builder()
                    .token(token)
                    .userId(user.getId())
                    .email(user.getEmail())
                    .displayName(user.getDisplayName())
                    .role(user.getRole() != null ? user.getRole().name() : "ROLE_USER")
                    .build();
        }

        // Kiểm tra thời hạn OTP (5 phút)
        if (user.getOtpExpiresAt() == null || Instant.now().isAfter(user.getOtpExpiresAt())) {
            studySessionRepository.deleteByUser(user);
            userRepository.delete(user);
            throw new IllegalArgumentException("Mã OTP đã hết hạn (quá 5 phút). Thông tin đăng ký đã bị xóa, vui lòng đăng ký mới.");
        }

        // Kiểm tra mã OTP qua băm BCrypt
        if (user.getOtpCode() == null || !passwordEncoder.matches(request.getOtp().trim(), user.getOtpCode())) {
            throw new IllegalArgumentException("Mã OTP xác minh không chính xác. Vui lòng thử lại.");
        }

        // OTP đúng -> kích hoạt tài khoản
        user.setEnabled(true);
        user.setOtpCode(null);
        user.setOtpExpiresAt(null);
        User updatedUser = userRepository.save(user);

        String token = jwtTokenProvider.generateToken(updatedUser.getEmail());

        return AuthResponse.builder()
                .token(token)
                .userId(updatedUser.getId())
                .email(updatedUser.getEmail())
                .displayName(updatedUser.getDisplayName())
                .role(updatedUser.getRole() != null ? updatedUser.getRole().name() : "ROLE_USER")
                .message("Kích hoạt tài khoản thành công!")
                .build();
    }

    @Transactional
    public AuthResponse resendOtp(ResendOtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmailAndEnabledFalse(email)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản chờ xác minh cho email này. Vui lòng đăng ký lại."));

        // Kiểm tra quá 5 phút chưa
        if (user.getCreatedAt() != null && user.getCreatedAt().isBefore(Instant.now().minus(5, ChronoUnit.MINUTES))) {
            studySessionRepository.deleteByUser(user);
            userRepository.delete(user);
            throw new IllegalArgumentException("Thời hạn xác minh (5 phút) đã hết. Tài khoản đã bị xóa, vui lòng thực hiện đăng ký lại.");
        }

        // Kiểm tra Rate Limit 1 phút (60 giây)
        if (user.getLastOtpSentAt() != null) {
            long secondsSinceLastSent = Duration.between(user.getLastOtpSentAt(), Instant.now()).getSeconds();
            if (secondsSinceLastSent < 60) {
                long waitSeconds = 60 - secondsSinceLastSent;
                throw new IllegalArgumentException("Vui lòng đợi " + waitSeconds + " giây trước khi yêu cầu mã OTP mới.");
            }
        }

        // Tạo lại OTP mới
        String newRawOtp = generate4DigitOtp();
        Instant now = Instant.now();
        user.setOtpCode(passwordEncoder.encode(newRawOtp));
        user.setOtpExpiresAt(now.plus(5, ChronoUnit.MINUTES));
        user.setLastOtpSentAt(now);
        userRepository.save(user);

        // Gửi email OTP mới
        emailService.sendOtpEmail(user.getEmail(), newRawOtp);

        return AuthResponse.builder()
                .requiresVerification(true)
                .email(user.getEmail())
                .message("Mã OTP mới đã được gửi tới email của bạn.")
                .build();
    }

    @Transactional
    public AuthResponse forgotPassword(com.studytracker.dto.ForgotPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản đã kích hoạt với địa chỉ email này."));

        if (Boolean.FALSE.equals(user.getEnabled())) {
            throw new IllegalArgumentException("Tài khoản chưa được kích hoạt. Vui lòng tiến hành đăng ký và kích hoạt tài khoản.");
        }

        // Kiểm tra Rate Limit 1 phút (60s)
        if (user.getLastOtpSentAt() != null) {
            long secondsSinceLastSent = Duration.between(user.getLastOtpSentAt(), Instant.now()).getSeconds();
            if (secondsSinceLastSent < 60) {
                long waitSeconds = 60 - secondsSinceLastSent;
                throw new IllegalArgumentException("Vui lòng đợi " + waitSeconds + " giây trước khi yêu cầu mã OTP mới.");
            }
        }

        String rawOtp = generate4DigitOtp();
        Instant now = Instant.now();

        user.setOtpCode(passwordEncoder.encode(rawOtp));
        user.setOtpExpiresAt(now.plus(5, ChronoUnit.MINUTES));
        user.setLastOtpSentAt(now);
        userRepository.save(user);

        // Gửi email khôi phục mật khẩu chứa OTP thô 4 chữ số
        emailService.sendPasswordResetEmail(user.getEmail(), rawOtp);

        return AuthResponse.builder()
                .requiresVerification(true)
                .email(user.getEmail())
                .message("Mã OTP khôi phục mật khẩu đã được gửi tới email của bạn.")
                .build();
    }

    @Transactional
    public AuthResponse verifyResetOtp(com.studytracker.dto.VerifyResetOtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin tài khoản. Vui lòng thực hiện lại."));

        if (Boolean.FALSE.equals(user.getEnabled())) {
            throw new IllegalArgumentException("Tài khoản chưa được kích hoạt.");
        }

        // Kiểm tra hạn OTP (5 phút)
        if (user.getOtpExpiresAt() == null || Instant.now().isAfter(user.getOtpExpiresAt())) {
            user.setOtpCode(null);
            user.setOtpExpiresAt(null);
            userRepository.save(user);
            throw new IllegalArgumentException("Mã OTP khôi phục mật khẩu đã hết hạn (quá 5 phút). Vui lòng yêu cầu mã mới.");
        }

        // Đối chiếu BCrypt OTP
        if (user.getOtpCode() == null || !passwordEncoder.matches(request.getOtp().trim(), user.getOtpCode())) {
            throw new IllegalArgumentException("Mã OTP xác minh không chính xác. Vui lòng thử lại.");
        }

        return AuthResponse.builder()
                .email(user.getEmail())
                .message("Xác minh mã OTP thành công! Vui lòng nhập mật khẩu mới.")
                .build();
    }

    @Transactional
    public AuthResponse resetPassword(com.studytracker.dto.ResetPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin tài khoản. Vui lòng thực hiện lại."));

        if (Boolean.FALSE.equals(user.getEnabled())) {
            throw new IllegalArgumentException("Tài khoản chưa được kích hoạt.");
        }

        // Kiểm tra hạn OTP (5 phút)
        if (user.getOtpExpiresAt() == null || Instant.now().isAfter(user.getOtpExpiresAt())) {
            user.setOtpCode(null);
            user.setOtpExpiresAt(null);
            userRepository.save(user);
            throw new IllegalArgumentException("Mã OTP đã hết hạn (quá 5 phút). Vui lòng yêu cầu gửi lại mã OTP.");
        }

        // Đối chiếu BCrypt OTP
        if (user.getOtpCode() == null || !passwordEncoder.matches(request.getOtp().trim(), user.getOtpCode())) {
            throw new IllegalArgumentException("Mã OTP không chính xác hoặc không hợp lệ.");
        }

        // Đặt lại mật khẩu mới
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setOtpCode(null);
        user.setOtpExpiresAt(null);
        userRepository.save(user);

        return AuthResponse.builder()
                .email(user.getEmail())
                .message("Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.")
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // Nếu tài khoản CHƯA kích hoạt
            if (Boolean.FALSE.equals(user.getEnabled())) {
                // Kiểm tra quá 5 phút chưa
                if (user.getCreatedAt() != null && user.getCreatedAt().isBefore(Instant.now().minus(5, ChronoUnit.MINUTES))) {
                    studySessionRepository.deleteByUser(user);
                    userRepository.delete(user);
                    throw new IllegalArgumentException("Tài khoản chưa xác minh đã quá hạn 5 phút và đã bị xóa. Vui lòng đăng ký lại.");
                }

                // Kiểm tra mật khẩu
                if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
                    throw new IllegalArgumentException("Email hoặc mật khẩu không chính xác.");
                }

                // Tự động chuyển đến màn hình xác minh OTP
                return AuthResponse.builder()
                        .requiresVerification(true)
                        .email(user.getEmail())
                        .displayName(user.getDisplayName())
                        .message("Tài khoản chưa được kích hoạt. Vui lòng nhập mã OTP gửi tới email của bạn.")
                        .build();
            }

            // Kiểm tra mật khẩu đối với tài khoản thường / tài khoản Google chưa tạo password
            if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
                if (user.getAuthProvider() == com.studytracker.model.AuthProvider.GOOGLE) {
                    throw new IllegalArgumentException("Tài khoản này được khởi tạo qua Google. Vui lòng bấm 'Đăng nhập bằng Google' hoặc dùng tính năng 'Quên mật khẩu' để tạo mật khẩu.");
                }
                throw new IllegalArgumentException("Email hoặc mật khẩu không chính xác.");
            }
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        if (Boolean.TRUE.equals(user.getBanned())) {
            String reason = user.getBanReason() != null ? user.getBanReason() : "Violated community guidelines";
            throw new IllegalArgumentException("Account banned. Reason: " + reason);
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword())
        );

        String token = jwtTokenProvider.generateToken(user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .role(user.getRole() != null ? user.getRole().name() : "ROLE_USER")
                .build();
    }

    public UserProgressResponse getUserProgress(User user) {
        User u = userRepository.findById(user.getId()).orElse(user);
        int xpRequired = xpService.getXpRequiredForNextLevel(u.getCurrentLevel());
        long pendingCount = friendshipService.getPendingRequestsCount(u);
        long unreadCount = messageRepository.countByRecipientIdAndIsReadFalse(u.getId());

        return UserProgressResponse.builder()
                .userId(u.getId())
                .email(u.getEmail())
                .displayName(u.getDisplayName())
                .avatarUrl(u.getAvatarUrl())
                .bio(u.getBio())
                .dailyGoalMinutes(u.getDailyGoalMinutes() != null ? u.getDailyGoalMinutes() : 60)
                .favoriteSubjects(u.getFavoriteSubjects())
                .selectedTitle(u.getSelectedTitle() != null ? u.getSelectedTitle() : "Tân Binh Tập Trung")
                .themeAccent(u.getThemeAccent() != null ? u.getThemeAccent() : "indigo")
                .soundEnabled(u.getSoundEnabled() != null ? u.getSoundEnabled() : true)
                .preferredLanguage(u.getPreferredLanguage() != null ? u.getPreferredLanguage() : "en")
                .activityStatusVisibility(u.getActivityStatusVisibility() != null ? u.getActivityStatusVisibility().name() : "EVERYONE")
                .messagePermission(u.getMessagePermission() != null ? u.getMessagePermission().name() : "EVERYONE")
                .authProvider(u.getAuthProvider() != null ? u.getAuthProvider().name() : "LOCAL")
                .role(u.getRole() != null ? u.getRole().name() : "ROLE_USER")
                .currentLevel(u.getCurrentLevel())
                .currentXp(u.getCurrentXp())
                .xpRequiredForNextLevel(xpRequired)
                .totalXp(u.getTotalXp())
                .pendingFriendRequestsCount(pendingCount)
                .unreadMessagesCount(unreadCount)
                .build();
    }

    @Transactional
    public UserProgressResponse updateProfile(User user, UpdateProfileRequest request) {
        User u = userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản không tồn tại"));

        if (request.getDisplayName() != null) {
            u.setDisplayName(request.getDisplayName().trim());
        }
        if (request.getAvatarUrl() != null) {
            String newAvatarUrl = request.getAvatarUrl().trim();
            if (u.getAvatarUrl() != null && !u.getAvatarUrl().equalsIgnoreCase(newAvatarUrl)) {
                fileStorageProvider.delete(u.getAvatarUrl());
            }
            u.setAvatarUrl(newAvatarUrl);
        }
        if (request.getBio() != null) {
            u.setBio(request.getBio().trim());
        }
        if (request.getDailyGoalMinutes() != null && request.getDailyGoalMinutes() > 0) {
            u.setDailyGoalMinutes(request.getDailyGoalMinutes());
        }
        if (request.getFavoriteSubjects() != null) {
            u.setFavoriteSubjects(request.getFavoriteSubjects().trim());
        }
        if (request.getSelectedTitle() != null) {
            u.setSelectedTitle(request.getSelectedTitle().trim());
        }
        if (request.getThemeAccent() != null) {
            u.setThemeAccent(request.getThemeAccent().trim());
        }
        if (request.getSoundEnabled() != null) {
            u.setSoundEnabled(request.getSoundEnabled());
        }
        if (request.getPreferredLanguage() != null) {
            String lang = request.getPreferredLanguage().trim();
            if ("vi".equalsIgnoreCase(lang) || "en".equalsIgnoreCase(lang) || "zh".equalsIgnoreCase(lang)) {
                u.setPreferredLanguage(lang.toLowerCase());
            }
        }
        if (request.getActivityStatusVisibility() != null) {
            try {
                u.setActivityStatusVisibility(com.studytracker.model.ActivityStatusVisibility.valueOf(request.getActivityStatusVisibility().trim().toUpperCase()));
            } catch (Exception ignored) {
            }
        }
        if (request.getMessagePermission() != null) {
            try {
                u.setMessagePermission(com.studytracker.model.MessagePermission.valueOf(request.getMessagePermission().trim().toUpperCase()));
            } catch (Exception ignored) {
            }
        }

        User updatedUser = userRepository.save(u);
        return getUserProgress(updatedUser);
    }

    @Transactional
    public UserProgressResponse uploadAvatar(User user, MultipartFile file) {
        User u = userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản không tồn tại"));

        if (u.getAvatarUrl() != null && !u.getAvatarUrl().isEmpty()) {
            fileStorageProvider.delete(u.getAvatarUrl());
        }

        String avatarUrl = fileStorageProvider.store(file, "avatars");
        u.setAvatarUrl(avatarUrl);
        User updatedUser = userRepository.save(u);
        return getUserProgress(updatedUser);
    }

    @Transactional
    public void changePassword(User user, ChangePasswordRequest request) {
        User u = userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản không tồn tại"));

        if (u.getAuthProvider() == com.studytracker.model.AuthProvider.GOOGLE) {
            throw new IllegalArgumentException("Tài khoản đăng nhập bằng Google không thể thay đổi mật khẩu tại đây.");
        }

        if (request.getCurrentPassword() == null || request.getCurrentPassword().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập mật khẩu hiện tại.");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), u.getPasswordHash())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không chính xác.");
        }

        if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu mới phải chứa ít nhất 6 ký tự.");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Xác nhận mật khẩu mới không trùng khớp.");
        }

        u.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(u);
    }

    public List<TitleOptionDto> getAvailableTitles(User user) {
        User u = userRepository.findById(user.getId()).orElse(user);
        int userLevel = u.getCurrentLevel() != null ? u.getCurrentLevel() : 1;

        List<TitleOptionDto> titles = new ArrayList<>();
        titles.add(new TitleOptionDto("Tân Binh Tập Trung", "Dành cho mọi thành viên mới bắt đầu hành trình học tập", 1, userLevel >= 1));
        titles.add(new TitleOptionDto("Học Giả Bền Bỉ", "Đạt Level 5 - Chứng tỏ tinh thần học tập kiên trì", 5, userLevel >= 5));
        titles.add(new TitleOptionDto("Chiến Binh Pomodoro", "Đạt Level 12 - Làm chủ kỹ năng quản lý thời gian", 12, userLevel >= 12));
        titles.add(new TitleOptionDto("Bậc Thầy Tập Trung", "Đạt Level 25 - Khả năng siêu tập trung không xao nhãng", 25, userLevel >= 25));
        titles.add(new TitleOptionDto("Đại Sứ Học Thuật", "Đạt Level 40 - Đỉnh cao tri thức và chuyên năng", 40, userLevel >= 40));
        titles.add(new TitleOptionDto("Huyền Thoại XP", "Đạt Level 60 - Huyền thoại trong giới cày XP học tập", 60, userLevel >= 60));
        titles.add(new TitleOptionDto("Thượng Cổ Thần Học", "Đạt Level 100 - Đỉnh phong chí tôn học giả", 100, userLevel >= 100));

        return titles;
    }

    @Transactional
    public List<OnlineUserResponse> getOnlineUsers(User currentUser) {
        // Update current user's activity heartbeat
        currentUser.setLastActiveAt(Instant.now());
        userRepository.save(currentUser);

        // Fetch users active in the last 2 minutes (excluding Admins and users who hid activity status from currentUser)
        Instant threshold = Instant.now().minus(Duration.ofMinutes(2));
        List<User> activeUsers = userRepository.findByLastActiveAtAfter(threshold).stream()
                .filter(u -> u.getRole() != com.studytracker.model.Role.ROLE_ADMIN)
                .filter(u -> friendshipService.shouldShowActivityStatus(u, currentUser))
                .collect(Collectors.toList());

        return activeUsers.stream().map(u -> {
            Optional<StudySession> activeSessionOpt = studySessionRepository.findByUserAndEndedAtIsNull(u);
            boolean isStudying = activeSessionOpt.isPresent();
            String currentSubject = isStudying ? activeSessionOpt.get().getSubject() : null;
            Instant studyStartedAt = isStudying ? activeSessionOpt.get().getStartedAt() : null;

            int realtimeLevel = u.getCurrentLevel() != null ? u.getCurrentLevel() : 1;
            int baseLevel = realtimeLevel;
            int currentXp = u.getCurrentXp() != null ? u.getCurrentXp() : 0;

            if (isStudying && studyStartedAt != null) {
                long elapsedSeconds = Math.max(0, Duration.between(studyStartedAt, Instant.now()).getSeconds());
                int xpEarned = xpService.calculateXpEarned((int) elapsedSeconds);
                int tempXp = currentXp + xpEarned;
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

            return OnlineUserResponse.builder()
                    .userId(u.getId())
                    .displayName(u.getDisplayName())
                    .avatarUrl(u.getAvatarUrl())
                    .selectedTitle(u.getSelectedTitle())
                    .lastActiveAt(u.getLastActiveAt())
                    .isStudying(isStudying)
                    .currentSubject(currentSubject)
                    .studyStartedAt(studyStartedAt)
                    .baseLevel(baseLevel)
                    .currentLevel(realtimeLevel)
                    .currentXp(currentXp)
                    .build();
        }).collect(Collectors.toList());
    }

    public List<UserSearchResponseDto> searchUsers(String query, User currentUser) {
        if (query == null || query.trim().isEmpty()) {
            return new ArrayList<>();
        }
        String cleanQuery = query.trim();
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 20);
        List<User> foundUsers = userRepository.findByDisplayNameContainingIgnoreCaseOrEmailContainingIgnoreCase(cleanQuery, cleanQuery, pageable);

        Instant onlineThreshold = Instant.now().minus(Duration.ofMinutes(2));

        return foundUsers.stream()
                .filter(u -> u.getEnabled() == null || Boolean.TRUE.equals(u.getEnabled()))
                .filter(u -> u.getRole() != com.studytracker.model.Role.ROLE_ADMIN)
                .map(u -> {
                    boolean canSeeStatus = friendshipService.shouldShowActivityStatus(u, currentUser);
                    boolean isOnline = canSeeStatus && u.getLastActiveAt() != null && u.getLastActiveAt().isAfter(onlineThreshold);
                    Optional<StudySession> activeSessionOpt = studySessionRepository.findByUserAndEndedAtIsNull(u);
                    boolean isStudying = canSeeStatus && activeSessionOpt.isPresent();

                    int baseLevel = u.getCurrentLevel() != null ? u.getCurrentLevel() : 1;
                    int currentXp = u.getCurrentXp() != null ? u.getCurrentXp() : 0;
                    int realtimeLevel = baseLevel;

                    if (isStudying && activeSessionOpt.get().getStartedAt() != null) {
                        long elapsedSeconds = Math.max(0, Duration.between(activeSessionOpt.get().getStartedAt(), Instant.now()).getSeconds());
                        int xpEarned = xpService.calculateXpEarned((int) elapsedSeconds);
                        int tempXp = currentXp + xpEarned;
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

                    com.studytracker.dto.FriendshipStatusDto relation = (currentUser != null) ? friendshipService.getRelationStatus(currentUser, u.getId()) : null;

                    return UserSearchResponseDto.builder()
                            .userId(u.getId())
                            .displayName(u.getDisplayName())
                            .avatarUrl(u.getAvatarUrl())
                            .selectedTitle(u.getSelectedTitle() != null ? u.getSelectedTitle() : "Tân Binh Tập Trung")
                            .currentLevel(realtimeLevel)
                            .totalXp(u.getTotalXp() != null ? u.getTotalXp() : 0L)
                            .isOnline(isOnline)
                            .isStudying(isStudying)
                            .lastActiveAt(canSeeStatus ? u.getLastActiveAt() : null)
                            .friendshipStatus(relation != null ? relation.getStatus() : "NONE")
                            .friendshipId(relation != null ? relation.getFriendshipId() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }

    public PublicUserProfileDto getPublicProfile(UUID userId) {
        return getPublicProfile(userId, null);
    }

    public PublicUserProfileDto getPublicProfile(UUID userId, User currentUser) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thành viên"));

        boolean canSeeStatus = friendshipService.shouldShowActivityStatus(u, currentUser);

        Instant onlineThreshold = Instant.now().minus(Duration.ofMinutes(2));
        boolean isOnline = canSeeStatus && u.getLastActiveAt() != null && u.getLastActiveAt().isAfter(onlineThreshold);

        Optional<StudySession> activeSessionOpt = studySessionRepository.findByUserAndEndedAtIsNull(u);
        boolean isStudying = canSeeStatus && activeSessionOpt.isPresent();
        String currentSubject = isStudying ? activeSessionOpt.get().getSubject() : null;
        Instant studyStartedAt = isStudying ? activeSessionOpt.get().getStartedAt() : null;

        int baseLevel = u.getCurrentLevel() != null ? u.getCurrentLevel() : 1;
        int currentXp = u.getCurrentXp() != null ? u.getCurrentXp() : 0;
        int realtimeLevel = baseLevel;
        int realtimeXp = currentXp;

        if (activeSessionOpt.isPresent() && activeSessionOpt.get().getStartedAt() != null) {
            long elapsedSeconds = Math.max(0, Duration.between(activeSessionOpt.get().getStartedAt(), Instant.now()).getSeconds());
            int xpEarned = xpService.calculateXpEarned((int) elapsedSeconds);
            int tempXp = currentXp + xpEarned;
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
            realtimeXp = tempXp;
        }

        List<StudySession> completedSessions = studySessionRepository.findByUserAndEndedAtIsNotNullOrderByStartedAtDesc(u);
        long totalSeconds = completedSessions.stream()
                .mapToLong(s -> s.getDurationSeconds() != null ? s.getDurationSeconds() : 0)
                .sum();
        long totalStudyTimeMinutes = totalSeconds / 60;
        long totalSessionsCount = completedSessions.size();

        java.util.Set<java.time.LocalDate> studyDates = completedSessions.stream()
                .map(s -> s.getStartedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate())
                .collect(Collectors.toSet());

        int streakDays = 0;
        java.time.LocalDate checkDate = java.time.LocalDate.now();
        if (!studyDates.contains(checkDate)) {
            checkDate = checkDate.minusDays(1);
        }
        while (studyDates.contains(checkDate)) {
            streakDays++;
            checkDate = checkDate.minusDays(1);
        }

        int xpRequired = xpService.getXpRequiredForNextLevel(realtimeLevel);

        com.studytracker.dto.FriendshipStatusDto relation = (currentUser != null) ? friendshipService.getRelationStatus(currentUser, userId) : null;

        return PublicUserProfileDto.builder()
                .userId(u.getId())
                .displayName(u.getDisplayName())
                .avatarUrl(u.getAvatarUrl())
                .selectedTitle(u.getSelectedTitle() != null ? u.getSelectedTitle() : "Tân Binh Tập Trung")
                .studyGoal(u.getBio())
                .currentLevel(realtimeLevel)
                .currentXp(realtimeXp)
                .xpRequiredForNextLevel(xpRequired)
                .totalXp(u.getTotalXp() != null ? u.getTotalXp() : 0L)
                .streakDays(streakDays)
                .isOnline(isOnline)
                .lastActiveAt(canSeeStatus ? u.getLastActiveAt() : null)
                .isStudying(isStudying)
                .currentSubject(currentSubject)
                .studyStartedAt(studyStartedAt)
                .totalStudyTimeMinutes(totalStudyTimeMinutes)
                .totalSessionsCount(totalSessionsCount)
                .friendshipStatus(relation != null ? relation.getStatus() : "NONE")
                .friendshipId(relation != null ? relation.getFriendshipId() : null)
                .build();
    }
}
