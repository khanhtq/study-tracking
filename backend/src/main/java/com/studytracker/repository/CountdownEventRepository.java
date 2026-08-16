package com.studytracker.repository;

import com.studytracker.model.CountdownEvent;
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
public interface CountdownEventRepository extends JpaRepository<CountdownEvent, UUID> {
    List<CountdownEvent> findByUserIdOrderByTargetDateAsc(UUID userId);

    List<CountdownEvent> findByUserIdAndTargetDateAfterOrderByTargetDateAsc(UUID userId, Instant now);
    
    Optional<CountdownEvent> findByUserIdAndIsPinnedTrue(UUID userId);

    Optional<CountdownEvent> findByUserIdAndPresetExamCode(UUID userId, String presetExamCode);

    List<CountdownEvent> findByPresetExamCode(String presetExamCode);

    long countByPresetExamCode(String presetExamCode);

    List<CountdownEvent> findByEmailNotifyTrue();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE CountdownEvent c SET c.isPinned = false WHERE c.user.id = :userId")
    void unpinAllForUser(@Param("userId") UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM CountdownEvent c WHERE c.presetExamCode = :presetExamCode")
    void deleteByPresetExamCode(@Param("presetExamCode") String presetExamCode);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM CountdownEvent c WHERE c.targetDate < :threshold")
    int deleteExpiredEvents(@Param("threshold") Instant threshold);
}
