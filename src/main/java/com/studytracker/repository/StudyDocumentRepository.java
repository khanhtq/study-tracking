package com.studytracker.repository;

import com.studytracker.model.StudyDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StudyDocumentRepository extends JpaRepository<StudyDocument, Long> {

    List<StudyDocument> findByUserIdAndParentIdAndIsDeletedFalseOrderByIdDesc(UUID userId, Long parentId);

    List<StudyDocument> findByUserIdAndParentIsNullAndIsDeletedFalseOrderByIdDesc(UUID userId);

    List<StudyDocument> findByUserIdAndIsDeletedTrueOrderByDeletedAtDesc(UUID userId);

    List<StudyDocument> findByUserIdAndIsFavoriteTrueAndIsDeletedFalseOrderByIdDesc(UUID userId);

    @Query("SELECT COALESCE(SUM(d.sizeBytes), 0) FROM StudyDocument d WHERE d.user.id = :userId AND d.isDeleted = false AND d.isFolder = false")
    Long sumSizeBytesByUserIdAndIsDeletedFalse(@Param("userId") UUID userId);

    @Query("SELECT d FROM StudyDocument d WHERE d.user.id = :userId AND d.isDeleted = false AND LOWER(d.name) LIKE LOWER(CONCAT('%', :keyword, '%')) ORDER BY d.isFolder DESC, d.updatedAt DESC")
    List<StudyDocument> searchByName(@Param("userId") UUID userId, @Param("keyword") String keyword);

    boolean existsByUserIdAndParentIdAndNameAndIsDeletedFalse(UUID userId, Long parentId, String name);

    boolean existsByUserIdAndParentIsNullAndNameAndIsDeletedFalse(UUID userId, String name);

    List<StudyDocument> findByParentIdAndIsDeletedFalse(Long parentId);
}
