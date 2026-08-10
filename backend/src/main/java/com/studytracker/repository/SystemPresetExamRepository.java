package com.studytracker.repository;

import com.studytracker.model.SystemPresetExam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SystemPresetExamRepository extends JpaRepository<SystemPresetExam, Long> {
    Optional<SystemPresetExam> findByExamCode(String examCode);
}
