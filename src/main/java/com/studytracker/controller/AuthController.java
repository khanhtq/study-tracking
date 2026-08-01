package com.studytracker.controller;

import com.studytracker.config.JwtTokenProvider;
import com.studytracker.dto.*;
import com.studytracker.model.User;
import com.studytracker.repository.UserRepository;
import com.studytracker.service.GoogleAuthService;
import com.studytracker.service.RefreshTokenService;
import com.studytracker.service.UserService;
import com.studytracker.util.CookieUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@Tag(name = "Authentication", description = "APIs cho Đăng ký, Đăng nhập, OTP và Quên mật khẩu")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final GoogleAuthService googleAuthService;
    private final RefreshTokenService refreshTokenService;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final CookieUtil cookieUtil;

    private AuthResponse attachAuthCookies(AuthResponse authResponse, HttpServletResponse response) {
        if (authResponse == null || authResponse.getEmail() == null || authResponse.isRequiresVerification()) {
            return authResponse;
        }

        Optional<User> userOpt = userRepository.findByEmail(authResponse.getEmail());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail());
            String refreshToken = refreshTokenService.createRefreshToken(user);

            ResponseCookie accessCookie = cookieUtil.createAccessTokenCookie(accessToken, jwtTokenProvider.getJwtExpirationMs());
            ResponseCookie refreshCookie = cookieUtil.createRefreshTokenCookie(refreshToken, jwtTokenProvider.getJwtRefreshExpirationMs());

            response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
            response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

            authResponse.setToken(accessToken);
        }
        return authResponse;
    }

    @Operation(summary = "Đăng ký tài khoản mới", description = "Tạo tài khoản người dùng mới và gửi mã OTP qua Email")
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        AuthResponse authResponse = userService.register(request);
        return ResponseEntity.ok(attachAuthCookies(authResponse, response));
    }

    @Operation(summary = "Đăng nhập bằng Google", description = "Đăng nhập hoặc đăng ký nhanh bằng Google ID Token")
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleAuthRequest request, HttpServletResponse response) {
        AuthResponse authResponse = googleAuthService.processGoogleLogin(request);
        return ResponseEntity.ok(attachAuthCookies(authResponse, response));
    }

    @Operation(summary = "Xác thực mã OTP đăng ký", description = "Xác thực mã OTP để kích hoạt tài khoản")
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request, HttpServletResponse response) {
        AuthResponse authResponse = userService.verifyOtp(request);
        return ResponseEntity.ok(attachAuthCookies(authResponse, response));
    }

    @Operation(summary = "Gửi lại mã OTP đăng ký", description = "Gửi lại mã OTP xác thực email đăng ký")
    @PostMapping("/resend-otp")
    public ResponseEntity<AuthResponse> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        return ResponseEntity.ok(userService.resendOtp(request));
    }

    @Operation(summary = "Yêu cầu quên mật khẩu", description = "Gửi mã OTP xác nhận quên mật khẩu qua Email")
    @PostMapping("/forgot-password")
    public ResponseEntity<AuthResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.ok(userService.forgotPassword(request));
    }

    @Operation(summary = "Xác thực OTP đặt lại mật khẩu", description = "Xác thực mã OTP trước khi đặt lại mật khẩu")
    @PostMapping("/verify-reset-otp")
    public ResponseEntity<AuthResponse> verifyResetOtp(@Valid @RequestBody VerifyResetOtpRequest request) {
        return ResponseEntity.ok(userService.verifyResetOtp(request));
    }

    @Operation(summary = "Đặt lại mật khẩu mới", description = "Tiến hành đổi mật khẩu mới sau khi đã xác thực OTP")
    @PostMapping("/reset-password")
    public ResponseEntity<AuthResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(userService.resetPassword(request));
    }

    @Operation(summary = "Đăng nhập", description = "Đăng nhập tài khoản bằng email/username và mật khẩu")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        AuthResponse authResponse = userService.login(request);
        return ResponseEntity.ok(attachAuthCookies(authResponse, response));
    }

    @Operation(summary = "Làm mới Access Token", description = "Sử dụng Refresh Token từ cookie để nhận Access Token mới")
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshTokenStr = cookieUtil.extractCookieValue(request, CookieUtil.REFRESH_TOKEN_COOKIE_NAME);
        if (refreshTokenStr == null || refreshTokenStr.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<User> userOpt = refreshTokenService.validateAndExtractUser(refreshTokenStr);
        if (userOpt.isEmpty()) {
            ResponseCookie cleanAccess = cookieUtil.createCleanAccessTokenCookie();
            ResponseCookie cleanRefresh = cookieUtil.createCleanRefreshTokenCookie();
            response.addHeader(HttpHeaders.SET_COOKIE, cleanAccess.toString());
            response.addHeader(HttpHeaders.SET_COOKIE, cleanRefresh.toString());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = userOpt.get();
        String newAccessToken = jwtTokenProvider.generateAccessToken(user.getEmail());
        String newRefreshToken = refreshTokenService.createRefreshToken(user);

        ResponseCookie accessCookie = cookieUtil.createAccessTokenCookie(newAccessToken, jwtTokenProvider.getJwtExpirationMs());
        ResponseCookie refreshCookie = cookieUtil.createRefreshTokenCookie(newRefreshToken, jwtTokenProvider.getJwtRefreshExpirationMs());

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        AuthResponse authResponse = AuthResponse.builder()
                .token(newAccessToken)
                .userId(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .role(user.getRole() != null ? user.getRole().name() : "ROLE_USER")
                .message("Token refreshed successfully")
                .build();

        return ResponseEntity.ok(authResponse);
    }

    @Operation(summary = "Đăng xuất", description = "Thu hồi Refresh Token và xóa HTTP-Only Cookies")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshTokenStr = cookieUtil.extractCookieValue(request, CookieUtil.REFRESH_TOKEN_COOKIE_NAME);
        if (refreshTokenStr != null && !refreshTokenStr.isBlank()) {
            refreshTokenService.revokeRefreshToken(refreshTokenStr);
        }

        ResponseCookie cleanAccess = cookieUtil.createCleanAccessTokenCookie();
        ResponseCookie cleanRefresh = cookieUtil.createCleanRefreshTokenCookie();
        response.addHeader(HttpHeaders.SET_COOKIE, cleanAccess.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cleanRefresh.toString());

        return ResponseEntity.ok().build();
    }
}
