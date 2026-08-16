package com.studytracker.repository;

import com.studytracker.model.GroupMember;
import com.studytracker.model.GroupMemberStatus;
import com.studytracker.model.GroupRole;
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
public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {

    Optional<GroupMember> findByGroupIdAndUserId(UUID groupId, UUID userId);

    boolean existsByGroupIdAndUserId(UUID groupId, UUID userId);

    boolean existsByGroupIdAndUserIdAndStatus(UUID groupId, UUID userId, GroupMemberStatus status);

    long countByGroupIdAndStatus(UUID groupId, GroupMemberStatus status);

    List<GroupMember> findByGroupIdAndStatus(UUID groupId, GroupMemberStatus status);

    Page<GroupMember> findByGroupIdAndStatusOrderByJoinedAtAsc(UUID groupId, GroupMemberStatus status, Pageable pageable);
    
    Page<GroupMember> findByGroupIdAndStatusInOrderByJoinedAtAsc(UUID groupId, List<GroupMemberStatus> statuses, Pageable pageable);

    long countByGroupIdAndStatusIn(UUID groupId, List<GroupMemberStatus> statuses);

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.user u WHERE gm.group.id = :groupId AND gm.status IN ('ACTIVE', 'MUTED') ORDER BY CASE gm.role WHEN 'OWNER' THEN 1 WHEN 'ADMIN' THEN 2 WHEN 'MODERATOR' THEN 3 ELSE 4 END, gm.joinedAt ASC")
    List<GroupMember> findActiveMembersWithUser(@Param("groupId") UUID groupId);

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.user u WHERE gm.group.id = :groupId AND gm.status IN ('ACTIVE', 'MUTED') AND (LOWER(u.displayName) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))) ORDER BY gm.joinedAt ASC")
    List<GroupMember> searchActiveMembers(@Param("groupId") UUID groupId, @Param("query") String query);

    void deleteByGroupIdAndUserId(UUID groupId, UUID userId);
}
