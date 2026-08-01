package com.studytracker.controller;

import com.studytracker.dto.AuthResponse;
import com.studytracker.dto.LoginRequest;
import com.studytracker.dto.RegisterRequest;
import com.studytracker.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.studytracker.dto.ResendOtpRequest;
import com.studytracker.dto.VerifyOtpRequest;

import com.studytracker.dto.ForgotPasswordRequest;
import com.studytracker.dto.ResetPasswordRequest;
import com.studytracker.dto.VerifyResetOtpRequest;

import com.studytracker.dto.GoogleAuthRequest;
import com.studytracker.service.GoogleAuthService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Authentication", description = "APIs cho Đăng ký, Đăng nhập, OTP và Quên mật khẩu")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final GoogleAuthService googleAuthService;

    @Operation(summary = "Đăng ký tài khoản mới", description = "Tạo tài khoản người dùng mới và gửi mã OTP qua Email")
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(userService.register(request));
    }

    @Operation(summary = "Đăng nhập bằng Google", description = "Đăng nhập hoặc đăng ký nhanh bằng Google ID Token")
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleAuthRequest request) {
        return ResponseEntity.ok(googleAuthService.processGoogleLogin(request));
    }

    @Operation(summary = "Xác thực mã OTP đăng ký", description = "Xác thực mã OTP để kích hoạt tài khoản")
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        return ResponseEntity.ok(userService.verifyOtp(request));
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
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }
}
