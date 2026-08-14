package com.studytracker.repository;

import com.studytracker.model.SystemPresetExam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemPresetExamRepository extends JpaRepository<SystemPresetExam, Long> {
    Optional<SystemPresetExam> findByExamCode(String examCode);

    List<SystemPresetExam> findAllByOrderByIsOfficialDateDescTrackerCountDescTargetDateAsc();

    @Query("SELECT s FROM SystemPresetExam s WHERE LOWER(s.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(s.description) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY s.isOfficialDate DESC, s.trackerCount DESC, s.targetDate ASC")
    List<SystemPresetExam> searchPresets(@Param("query") String query);

    @Modifying
    @Query("UPDATE SystemPresetExam s SET s.trackerCount = s.trackerCount + 1 WHERE s.examCode = :examCode")
    void incrementTrackerCount(@Param("examCode") String examCode);

    @Modifying
    @Query("UPDATE SystemPresetExam s SET s.trackerCount = GREATEST(0, s.trackerCount - 1) WHERE s.examCode = :examCode")
    void decrementTrackerCount(@Param("examCode") String examCode);
}

