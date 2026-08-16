package com.studytracker.repository;

import com.studytracker.model.ChatGroup;
import com.studytracker.model.GroupPrivacy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatGroupRepository extends JpaRepository<ChatGroup, UUID> {

    Optional<ChatGroup> findBySlug(String slug);

    Optional<ChatGroup> findBySlugAndDeletedAtIsNull(String slug);

    boolean existsBySlug(String slug);

    @Query("SELECT g FROM ChatGroup g WHERE g.owner.id = :ownerId AND g.isArchived = false AND g.deletedAt IS NULL ORDER BY g.createdAt DESC")
    List<ChatGroup> findByOwnerIdAndIsArchivedFalseOrderByCreatedAtDesc(@Param("ownerId") UUID ownerId);

    @Query("SELECT g FROM ChatGroup g WHERE g.privacy = 'PUBLIC' AND g.isArchived = false AND g.deletedAt IS NULL ORDER BY g.popularityScore DESC, g.memberCount DESC")
    Page<ChatGroup> findPopularPublicGroups(Pageable pageable);

    @Query("SELECT g FROM ChatGroup g WHERE g.privacy = 'PUBLIC' AND g.isArchived = false AND g.deletedAt IS NULL AND (LOWER(g.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(g.description) LIKE LOWER(CONCAT('%', :query, '%'))) ORDER BY g.popularityScore DESC, g.memberCount DESC")
    Page<ChatGroup> searchPublicGroups(@Param("query") String query, Pageable pageable);

    @Query("SELECT g FROM ChatGroup g JOIN GroupMember gm ON g.id = gm.group.id WHERE gm.user.id = :userId AND gm.status IN ('ACTIVE', 'MUTED') AND g.isArchived = false AND g.deletedAt IS NULL ORDER BY g.updatedAt DESC")
    List<ChatGroup> findMyActiveGroups(@Param("userId") UUID userId);
}
