package com.studytracker.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.Collections;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = true)
    private String passwordHash;

    private String displayName;

    private String avatarUrl;

    private String bio;

    @Builder.Default
    private Integer dailyGoalMinutes = 60;

    private String favoriteSubjects;

    @Builder.Default
    private String selectedTitle = "Tân Binh Tập Trung";

    @Builder.Default
    private String themeAccent = "indigo";

    @Builder.Default
    private Boolean soundEnabled = true;

    @Builder.Default
    private String preferredLanguage = "en";

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "activity_status_visibility")
    private ActivityStatusVisibility activityStatusVisibility = ActivityStatusVisibility.EVERYONE;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "message_permission")
    private MessagePermission messagePermission = MessagePermission.EVERYONE;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider")
    private AuthProvider authProvider = AuthProvider.LOCAL;

    @Builder.Default
    @Column(nullable = false)
    private Integer currentLevel = 1;

    @Builder.Default
    @Column(nullable = false)
    private Integer currentXp = 0;

    @Builder.Default
    @Column(nullable = false)
    private Long totalXp = 0L;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    private Instant lastActiveAt;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "role", columnDefinition = "VARCHAR(255) DEFAULT 'ROLE_USER'")
    private Role role = Role.ROLE_USER;

    @Builder.Default
    @Column(name = "enabled", columnDefinition = "boolean default false")
    private Boolean enabled = false;

    @Column(name = "otp_code")
    private String otpCode;

    @Column(name = "otp_expires_at")
    private Instant otpExpiresAt;

    @Column(name = "last_otp_sent_at")
    private Instant lastOtpSentAt;

    @Builder.Default
    @Column(name = "banned", columnDefinition = "boolean default false")
    private Boolean banned = false;

    @Column(name = "ban_reason")
    private String banReason;

    @Column(name = "banned_at")
    private Instant bannedAt;

    @Builder.Default
    @Column(name = "is_premium", columnDefinition = "boolean default false")
    private Boolean isPremium = false;

    @Column(name = "premium_until")
    private Instant premiumUntil;

    public boolean isPremiumActive() {
        if (!Boolean.TRUE.equals(isPremium)) {
            return false;
        }
        return premiumUntil == null || premiumUntil.isAfter(Instant.now());
    }


    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(new SimpleGrantedAuthority(role != null ? role.name() : Role.ROLE_USER.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !Boolean.TRUE.equals(banned);
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return Boolean.TRUE.equals(enabled);
    }
}
