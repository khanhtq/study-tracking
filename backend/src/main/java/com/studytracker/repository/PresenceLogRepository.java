package com.studytracker.repository;

import com.studytracker.model.PresenceLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PresenceLogRepository extends JpaRepository<PresenceLog, Long> {
    List<PresenceLog> findByUserIdAndSessionId(UUID userId, UUID sessionId);
}
