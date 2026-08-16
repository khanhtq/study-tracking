package com.studytracker.repository;

import com.studytracker.model.SystemPresetExam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SystemPresetExamRepository extends JpaRepository<SystemPresetExam, Long> {
    Optional<SystemPresetExam> findByExamCode(String examCode);

    List<SystemPresetExam> findAllByOrderByIsOfficialDateDescTrackerCountDescTargetDateAsc();

    @Query("SELECT s FROM SystemPresetExam s WHERE s.targetDate > :now ORDER BY s.isOfficialDate DESC, s.trackerCount DESC, s.targetDate ASC")
    List<SystemPresetExam> findActivePresets(@Param("now") Instant now);

    @Query("SELECT s FROM SystemPresetExam s WHERE s.targetDate > :now AND (LOWER(s.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(s.description) LIKE LOWER(CONCAT('%', :query, '%'))) ORDER BY s.isOfficialDate DESC, s.trackerCount DESC, s.targetDate ASC")
    List<SystemPresetExam> searchActivePresets(@Param("query") String query, @Param("now") Instant now);

    @Query("SELECT s FROM SystemPresetExam s WHERE LOWER(s.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(s.description) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY s.isOfficialDate DESC, s.trackerCount DESC, s.targetDate ASC")
    List<SystemPresetExam> searchPresets(@Param("query") String query);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SystemPresetExam s SET s.trackerCount = COALESCE(s.trackerCount, 0) + 1 WHERE s.examCode = :examCode")
    void incrementTrackerCount(@Param("examCode") String examCode);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SystemPresetExam s SET s.trackerCount = GREATEST(0, COALESCE(s.trackerCount, 0) - 1) WHERE s.examCode = :examCode")
    void decrementTrackerCount(@Param("examCode") String examCode);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM SystemPresetExam s WHERE s.targetDate < :threshold AND s.isCommunityEvent = true")
    int deleteExpiredCommunityPresets(@Param("threshold") Instant threshold);
}
