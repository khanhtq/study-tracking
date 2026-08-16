package com.studytracker.repository;

import com.studytracker.model.GroupJoinRequest;
import com.studytracker.model.JoinRequestStatus;
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
public interface GroupJoinRequestRepository extends JpaRepository<GroupJoinRequest, UUID> {

    Optional<GroupJoinRequest> findByGroupIdAndUserIdAndStatus(UUID groupId, UUID userId, JoinRequestStatus status);

    boolean existsByGroupIdAndUserIdAndStatus(UUID groupId, UUID userId, JoinRequestStatus status);

    List<GroupJoinRequest> findByGroupIdAndStatusOrderByCreatedAtDesc(UUID groupId, JoinRequestStatus status);

    Page<GroupJoinRequest> findByGroupIdAndStatusOrderByCreatedAtDesc(UUID groupId, JoinRequestStatus status, Pageable pageable);

    @Query("SELECT r FROM GroupJoinRequest r JOIN FETCH r.user u WHERE r.group.id = :groupId AND r.status = :status ORDER BY r.createdAt DESC")
    List<GroupJoinRequest> findPendingRequestsWithUser(@Param("groupId") UUID groupId, @Param("status") JoinRequestStatus status);

    long countByGroupIdAndStatus(UUID groupId, JoinRequestStatus status);
}
