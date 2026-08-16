package com.studytracker.repository;

import com.studytracker.model.GroupMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupMessageRepository extends JpaRepository<GroupMessage, UUID> {

    @Query("SELECT m FROM GroupMessage m JOIN FETCH m.sender s LEFT JOIN FETCH m.replyTo r LEFT JOIN FETCH r.sender rs WHERE m.group.id = :groupId AND m.isDeleted = false ORDER BY m.createdAt DESC")
    List<GroupMessage> findLatestMessages(@Param("groupId") UUID groupId, Pageable pageable);

    @Query("SELECT m FROM GroupMessage m JOIN FETCH m.sender s LEFT JOIN FETCH m.replyTo r LEFT JOIN FETCH r.sender rs WHERE m.group.id = :groupId AND m.createdAt < :beforeTimestamp AND m.isDeleted = false ORDER BY m.createdAt DESC")
    List<GroupMessage> findOlderMessages(@Param("groupId") UUID groupId, @Param("beforeTimestamp") Instant beforeTimestamp, Pageable pageable);

    @Query("SELECT m FROM GroupMessage m JOIN FETCH m.sender s WHERE m.group.id = :groupId AND m.isDeleted = false AND LOWER(m.content) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY m.createdAt DESC")
    List<GroupMessage> searchMessages(@Param("groupId") UUID groupId, @Param("query") String query, Pageable pageable);

    @Query("SELECT m FROM GroupMessage m JOIN FETCH m.sender s WHERE m.group.id = :groupId AND m.isPinned = true AND m.isDeleted = false ORDER BY m.createdAt DESC")
    List<GroupMessage> findPinnedMessages(@Param("groupId") UUID groupId);

    @Query("SELECT m FROM GroupMessage m JOIN FETCH m.sender s LEFT JOIN FETCH m.replyTo r LEFT JOIN FETCH r.sender rs WHERE m.id = :id AND m.isDeleted = false")
    Optional<GroupMessage> findActiveByIdWithDetails(@Param("id") UUID id);

    long countByGroupIdAndIsDeletedFalse(UUID groupId);
}
