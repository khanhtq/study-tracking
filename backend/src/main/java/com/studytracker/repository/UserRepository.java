package com.studytracker.repository;

import com.studytracker.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Modifying;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailAndEnabledFalse(String email);
    boolean existsByEmail(String email);
    boolean existsByEmailAndEnabledTrue(String email);
    List<User> findByLastActiveAtAfter(Instant timestamp);

    @Modifying
    void deleteByEnabledFalseAndCreatedAtBefore(Instant threshold);

    List<User> findByDisplayNameContainingIgnoreCaseOrEmailContainingIgnoreCase(String displayNameKeyword, String emailKeyword, org.springframework.data.domain.Pageable pageable);
}
