package com.studytracker.repository;

import com.studytracker.model.GroupPinnedMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupPinnedMessageRepository extends JpaRepository<GroupPinnedMessage, UUID> {

    @Query("SELECT pm FROM GroupPinnedMessage pm JOIN FETCH pm.message m JOIN FETCH m.sender s JOIN FETCH pm.pinnedBy pb WHERE pm.group.id = :groupId ORDER BY pm.pinnedAt DESC")
    List<GroupPinnedMessage> findByGroupIdWithDetails(@Param("groupId") UUID groupId);

    Optional<GroupPinnedMessage> findByGroupIdAndMessageId(UUID groupId, UUID messageId);

    boolean existsByGroupIdAndMessageId(UUID groupId, UUID messageId);

    void deleteByGroupIdAndMessageId(UUID groupId, UUID messageId);
}
