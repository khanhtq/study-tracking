package com.studytracker.repository;

import com.studytracker.model.CountdownEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CountdownEventRepository extends JpaRepository<CountdownEvent, UUID> {
    List<CountdownEvent> findByUserIdOrderByTargetDateAsc(UUID userId);
    
    Optional<CountdownEvent> findByUserIdAndIsPinnedTrue(UUID userId);

    List<CountdownEvent> findByPresetExamCode(String presetExamCode);

    List<CountdownEvent> findByEmailNotifyTrue();

    @Modifying
    @Query("UPDATE CountdownEvent c SET c.isPinned = false WHERE c.user.id = :userId")
    void unpinAllForUser(@Param("userId") UUID userId);
}
