package com.studytracker.repository;

import com.studytracker.model.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, UUID> {

    List<MessageReaction> findByMessageId(UUID messageId);

    @Query("SELECT r FROM MessageReaction r JOIN FETCH r.user u WHERE r.message.id IN :messageIds")
    List<MessageReaction> findByMessageIdInWithUser(@Param("messageIds") List<UUID> messageIds);

    Optional<MessageReaction> findByMessageIdAndUserIdAndEmoji(UUID messageId, UUID userId, String emoji);

    boolean existsByMessageIdAndUserIdAndEmoji(UUID messageId, UUID userId, String emoji);

    void deleteByMessageIdAndUserIdAndEmoji(UUID messageId, UUID userId, String emoji);
}
