package com.studytracker.service;

import com.studytracker.config.JwtTokenProvider;
import com.studytracker.model.RefreshToken;
import com.studytracker.model.User;
import com.studytracker.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;

    public String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    @Transactional
    public String createRefreshToken(User user) {
        // Delete previous refresh tokens for clean state
        refreshTokenRepository.deleteByUser(user);

        String refreshTokenStr = jwtTokenProvider.generateRefreshToken(user.getEmail());
        String tokenHash = hashToken(refreshTokenStr);
        Instant expiresAt = Instant.now().plusMillis(jwtTokenProvider.getJwtRefreshExpirationMs());

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(expiresAt)
                .revoked(false)
                .build();

        refreshTokenRepository.save(refreshToken);
        return refreshTokenStr;
    }

    @Transactional(readOnly = true)
    public Optional<RefreshToken> findByToken(String refreshTokenStr) {
        if (refreshTokenStr == null || refreshTokenStr.isBlank()) {
            return Optional.empty();
        }
        String tokenHash = hashToken(refreshTokenStr);
        return refreshTokenRepository.findByTokenHash(tokenHash);
    }

    @Transactional
    public Optional<User> validateAndExtractUser(String refreshTokenStr) {
        if (!jwtTokenProvider.validateToken(refreshTokenStr)) {
            return Optional.empty();
        }

        String email = jwtTokenProvider.extractUsername(refreshTokenStr);
        Optional<RefreshToken> tokenOpt = findByToken(refreshTokenStr);

        if (tokenOpt.isEmpty()) {
            return Optional.empty();
        }

        RefreshToken token = tokenOpt.get();
        if (token.getRevoked() || token.getExpiresAt().isBefore(Instant.now())) {
            refreshTokenRepository.delete(token);
            return Optional.empty();
        }

        if (!token.getUser().getEmail().equals(email)) {
            return Optional.empty();
        }

        return Optional.of(token.getUser());
    }

    @Transactional
    public void revokeRefreshToken(String refreshTokenStr) {
        if (refreshTokenStr == null || refreshTokenStr.isBlank()) return;
        String tokenHash = hashToken(refreshTokenStr);
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    public void deleteByUser(User user) {
        refreshTokenRepository.deleteByUser(user);
    }
}
