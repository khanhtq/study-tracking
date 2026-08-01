package com.studytracker.repository;

import com.studytracker.model.StudySession;
import com.studytracker.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, UUID> {
    Optional<StudySession> findByUserAndEndedAtIsNull(User user);
    List<StudySession> findByUserOrderByStartedAtDesc(User user);
    List<StudySession> findByUserAndEndedAtIsNotNullOrderByStartedAtDesc(User user);
    List<StudySession> findByUserAndStartedAtAfter(User user, Instant from);
    List<StudySession> findByStartedAtAfter(Instant from);
    List<StudySession> findByEndedAtIsNullAndLastHeartbeatAtBefore(Instant cutoff);
    List<StudySession> findByEndedAtIsNullAndLastHeartbeatAtIsNullAndStartedAtBefore(Instant cutoff);
    long countByEndedAtIsNotNull();

    @Query("SELECT COUNT(s) > 0 FROM StudySession s WHERE s.user = :user AND " +
           "(:excludeId IS NULL OR s.id <> :excludeId) AND " +
           "((s.endedAt IS NOT NULL AND s.startedAt < :endedAt AND s.endedAt > :startedAt) OR " +
           "(s.endedAt IS NULL AND s.startedAt < :endedAt))")
    boolean existsOverlappingSession(@Param("user") User user, 
                                    @Param("startedAt") Instant startedAt, 
                                    @Param("endedAt") Instant endedAt,
                                    @Param("excludeId") UUID excludeId);

    @Modifying
    void deleteByUser(User user);

    @Modifying
    @Query("DELETE FROM StudySession s WHERE s.user.enabled = false AND s.user.createdAt < :threshold")
    void deleteByUnverifiedUsers(@Param("threshold") Instant threshold);
}
