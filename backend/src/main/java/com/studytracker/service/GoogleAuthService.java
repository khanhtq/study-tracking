package com.studytracker.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.studytracker.config.JwtTokenProvider;
import com.studytracker.dto.AuthResponse;
import com.studytracker.dto.GoogleAuthRequest;
import com.studytracker.model.AuthProvider;
import com.studytracker.model.User;
import com.studytracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleAuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    @Transactional
    public AuthResponse processGoogleLogin(GoogleAuthRequest request) {
        GoogleIdToken.Payload payload = verifyGoogleToken(request.getIdToken());
        if (payload == null) {
            throw new IllegalArgumentException("Mã Google ID Token không hợp lệ hoặc đã hết hạn.");
        }

        String email = payload.getEmail().trim().toLowerCase();
        Boolean emailVerified = payload.getEmailVerified();
        if (Boolean.FALSE.equals(emailVerified)) {
            throw new IllegalArgumentException("Địa chỉ Email Google chưa được xác thực.");
        }

        String name = (String) payload.get("name");
        String pictureUrl = (String) payload.get("picture");

        Optional<User> userOpt = userRepository.findByEmail(email);
        User user;

        if (userOpt.isPresent()) {
            user = userOpt.get();
            // Nếu tài khoản từng được tạo qua form local nhưng chưa kích hoạt OTP,
            // hoặc chưa được enabled -> tự động kích hoạt vì Google đã verify email.
            if (Boolean.FALSE.equals(user.getEnabled())) {
                user.setEnabled(true);
                user.setOtpCode(null);
                user.setOtpExpiresAt(null);
            }
            if ((user.getDisplayName() == null || user.getDisplayName().isBlank()) && name != null) {
                user.setDisplayName(name);
            }
            if ((user.getAvatarUrl() == null || user.getAvatarUrl().isBlank()) && pictureUrl != null) {
                user.setAvatarUrl(pictureUrl);
            }
            if (Boolean.TRUE.equals(user.getBanned())) {
                String reason = user.getBanReason() != null ? user.getBanReason() : "Vi phạm quy chuẩn cộng đồng";
                throw new IllegalArgumentException("Tài khoản của bạn đã bị cấm. Lý do: " + reason);
            }
            user = userRepository.save(user);
        } else {
            // Tạo mới user hoàn toàn từ Google với passwordHash ngẫu nhiên thỏa mãn NOT NULL constraint
            String randomDummyPassword = passwordEncoder.encode("OAUTH_GOOGLE_" + UUID.randomUUID());
            user = User.builder()
                    .email(email)
                    .passwordHash(randomDummyPassword)
                    .displayName(name != null ? name : email.split("@")[0])
                    .avatarUrl(pictureUrl)
                    .authProvider(AuthProvider.GOOGLE)
                    .enabled(true)
                    .currentLevel(1)
                    .currentXp(0)
                    .totalXp(0L)
                    .build();
            user = userRepository.save(user);
        }

        String token = jwtTokenProvider.generateToken(user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .role(user.getRole() != null ? user.getRole().name() : "ROLE_USER")
                .message("Đăng nhập bằng Google thành công!")
                .build();
    }

    private GoogleIdToken.Payload verifyGoogleToken(String idTokenString) {
        try {
            GoogleIdTokenVerifier.Builder builder = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    new GsonFactory()
            );

            if (googleClientId != null && !googleClientId.isBlank() && !"your-google-client-id".equals(googleClientId)) {
                builder.setAudience(Collections.singletonList(googleClientId));
            }

            GoogleIdTokenVerifier verifier = builder.build();
            GoogleIdToken idToken = verifier.verify(idTokenString);

            if (idToken != null) {
                return idToken.getPayload();
            } else {
                log.error("Google ID token verification failed: token is null");
                return null;
            }
        } catch (Exception e) {
            log.error("Error verifying Google ID token: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Không thể xác thực mã Google ID Token: " + e.getMessage());
        }
    }
}
