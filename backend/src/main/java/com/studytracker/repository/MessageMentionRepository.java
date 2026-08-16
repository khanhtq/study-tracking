package com.studytracker.repository;

import com.studytracker.model.MessageMention;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageMentionRepository extends JpaRepository<MessageMention, UUID> {

    List<MessageMention> findByMentionedUserIdAndIsReadFalseOrderByCreatedAtDesc(UUID mentionedUserId, Pageable pageable);

    long countByMentionedUserIdAndIsReadFalse(UUID mentionedUserId);

    @Modifying
    @Query("UPDATE MessageMention mm SET mm.isRead = true WHERE mm.group.id = :groupId AND mm.mentionedUser.id = :userId AND mm.isRead = false")
    int markMentionsAsReadInGroup(@Param("groupId") UUID groupId, @Param("userId") UUID userId);
}
