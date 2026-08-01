package com.studytracker.repository;

import com.studytracker.model.RefreshToken;
import com.studytracker.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    void deleteByUser(User user);

    @Modifying
    void deleteByExpiresAtBefore(Instant now);
}
