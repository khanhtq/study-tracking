package com.studytracker.repository;

import com.studytracker.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    @Query("SELECT m FROM Message m WHERE (m.sender.id = :user1 AND m.recipient.id = :user2) " +
           "OR (m.sender.id = :user2 AND m.recipient.id = :user1) ORDER BY m.createdAt DESC")
    Page<Message> findConversationBetweenUsers(@Param("user1") UUID user1, @Param("user2") UUID user2, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE (m.sender.id = :user1 AND m.recipient.id = :user2) " +
           "OR (m.sender.id = :user2 AND m.recipient.id = :user1) ORDER BY m.createdAt DESC LIMIT 1")
    Optional<Message> findLatestMessageBetween(@Param("user1") UUID user1, @Param("user2") UUID user2);

    @Query("SELECT DISTINCT CASE WHEN m.sender.id = :userId THEN m.recipient.id ELSE m.sender.id END " +
           "FROM Message m WHERE m.sender.id = :userId OR m.recipient.id = :userId")
    List<UUID> findConversationPartnerIds(@Param("userId") UUID userId);

    long countByRecipientIdAndIsReadFalse(UUID recipientId);

    long countByRecipientIdAndSenderIdAndIsReadFalse(UUID recipientId, UUID senderId);

    @Modifying
    @Query("UPDATE Message m SET m.isRead = true, m.readAt = :readAt " +
           "WHERE m.recipient.id = :recipientId AND m.sender.id = :senderId AND m.isRead = false")
    int markConversationAsRead(@Param("recipientId") UUID recipientId,
                              @Param("senderId") UUID senderId,
                              @Param("readAt") Instant readAt);
}
