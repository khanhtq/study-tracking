package com.studytracker.repository;

import com.studytracker.model.MessageAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.studytracker.model.AttachmentType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageAttachmentRepository extends JpaRepository<MessageAttachment, UUID> {

    List<MessageAttachment> findByMessageId(UUID messageId);

    List<MessageAttachment> findByMessageIdIn(List<UUID> messageIds);

    @Query("SELECT ma FROM MessageAttachment ma JOIN FETCH ma.message m JOIN FETCH m.sender u WHERE m.group.id = :groupId AND m.isDeleted = false ORDER BY ma.createdAt DESC")
    List<MessageAttachment> findActiveAttachmentsByGroupId(@Param("groupId") UUID groupId);

    @Query("SELECT ma FROM MessageAttachment ma JOIN FETCH ma.message m JOIN FETCH m.sender u WHERE m.group.id = :groupId AND m.isDeleted = false AND ma.attachmentType = :type ORDER BY ma.createdAt DESC")
    List<MessageAttachment> findActiveAttachmentsByGroupIdAndType(@Param("groupId") UUID groupId, @Param("type") AttachmentType type);

    @Query("SELECT ma FROM MessageAttachment ma JOIN FETCH ma.message m JOIN FETCH m.sender u WHERE m.group.id = :groupId AND m.isDeleted = false AND ma.attachmentType IN :types ORDER BY ma.createdAt DESC")
    List<MessageAttachment> findActiveAttachmentsByGroupIdAndTypes(@Param("groupId") UUID groupId, @Param("types") List<AttachmentType> types);
}
