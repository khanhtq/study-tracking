package com.studytracker.service;

import com.studytracker.dto.DocumentDto;
import com.studytracker.dto.GroupMessageDto;
import com.studytracker.dto.MessageAttachmentDto;
import com.studytracker.dto.SendMessagePayload;
import com.studytracker.dto.AttachmentInputDto;
import com.studytracker.model.*;
import com.studytracker.repository.MessageAttachmentRepository;
import com.studytracker.repository.StudyDocumentRepository;
import com.studytracker.service.storage.DocumentStorageProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatMediaService {

    private final DocumentStorageProvider storageProvider;
    private final MessageAttachmentRepository messageAttachmentRepository;
    private final StudyDocumentRepository studyDocumentRepository;
    private final GroupService groupService;
    private final ChatRealtimeService chatRealtimeService;
    private final DocumentService documentService;

    @Transactional
    public MessageAttachmentDto uploadChatFile(UUID groupId, User currentUser, MultipartFile file) {
        groupService.verifyGroupMember(groupId, currentUser.getId());

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Tệp tải lên không được để trống");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.trim().isEmpty()) {
            originalFilename = "unnamed_file";
        }
        originalFilename = originalFilename.trim();

        String uuid = UUID.randomUUID().toString().substring(0, 8);
        String sanitizedName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String targetPath = "chat/" + groupId + "/" + System.currentTimeMillis() + "_" + uuid + "_" + sanitizedName;

        // Upload trực tiếp lên Azure Blob Storage qua provider
        storageProvider.upload(file, targetPath);

        // Sinh SAS Download URL an toàn (hoặc /uploads/ URL cho local)
        String sasUrl = storageProvider.generateDownloadUrl(targetPath, originalFilename, 0);
        if (sasUrl == null || sasUrl.isEmpty()) {
            String cleanPath = targetPath.startsWith("/") ? targetPath.substring(1) : targetPath;
            sasUrl = "/uploads/" + cleanPath;
        }

        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        AttachmentType attachmentType = determineAttachmentType(contentType, originalFilename);

        log.info("Người dùng [{}] đã tải tệp [{}] lên nhóm [{}] thành công", currentUser.getEmail(), originalFilename, groupId);

        return MessageAttachmentDto.builder()
                .fileUrl(sasUrl)
                .thumbnailUrl(attachmentType == AttachmentType.IMAGE ? sasUrl : null)
                .fileName(originalFilename)
                .fileSize(file.getSize())
                .mimeType(contentType)
                .attachmentType(attachmentType)
                .metadata("{\"storagePath\":\"" + targetPath + "\"}")
                .build();
    }

    @Transactional
    public GroupMessageDto shareStudyDocument(UUID groupId, User currentUser, Long documentId, String caption) {
        groupService.verifyGroupMember(groupId, currentUser.getId());

        StudyDocument doc = studyDocumentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài liệu học tập"));

        if (!doc.getUser().getId().equals(currentUser.getId())) {
            throw new SecurityException("Bạn chỉ có thể chia sẻ tài liệu từ kho của chính mình");
        }

        if (doc.getIsDeleted() || doc.getIsFolder()) {
            throw new IllegalArgumentException("Không thể chia sẻ thư mục hoặc tài liệu đã bị xóa");
        }

        String sasUrl = storageProvider.generateDownloadUrl(doc.getStoragePath(), doc.getOriginalFilename(), 0);
        if (sasUrl == null || sasUrl.isEmpty()) {
            sasUrl = "/api/documents/stream?path=" + doc.getStoragePath();
        }

        AttachmentType attachmentType = AttachmentType.STUDY_DOCUMENT;
        if (doc.getContentType() != null) {
            if (doc.getContentType().startsWith("image/")) attachmentType = AttachmentType.IMAGE;
            else if (doc.getContentType().startsWith("video/")) attachmentType = AttachmentType.VIDEO;
            else if (doc.getContentType().startsWith("audio/")) attachmentType = AttachmentType.AUDIO;
        }

        AttachmentInputDto attInput = AttachmentInputDto.builder()
                .studyDocumentId(doc.getId())
                .fileUrl(sasUrl)
                .thumbnailUrl(attachmentType == AttachmentType.IMAGE ? sasUrl : null)
                .fileName(doc.getOriginalFilename() != null ? doc.getOriginalFilename() : doc.getName())
                .fileSize(doc.getSizeBytes() != null ? doc.getSizeBytes() : 0L)
                .mimeType(doc.getContentType() != null ? doc.getContentType() : "application/octet-stream")
                .attachmentType(attachmentType)
                .metadata("{\"storagePath\":\"" + doc.getStoragePath() + "\",\"originalDocId\":" + doc.getId() + "}")
                .build();

        SendMessagePayload payload = SendMessagePayload.builder()
                .content(caption != null && !caption.trim().isEmpty() ? caption.trim() : ("Đã chia sẻ tài liệu: " + doc.getName()))
                .messageType(GroupMessageType.STUDY_DOCUMENT)
                .attachments(Collections.singletonList(attInput))
                .build();

        return chatRealtimeService.sendMessage(groupId, currentUser, payload);
    }

    @Transactional
    public DocumentDto saveSharedDocumentToMyLibrary(UUID groupId, User currentUser, UUID attachmentId) {
        groupService.verifyGroupMember(groupId, currentUser.getId());

        MessageAttachment attachment = messageAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tệp đính kèm"));

        String name = attachment.getFileName();
        String originalFilename = attachment.getFileName();
        String storagePath = null;
        String storageProviderName = storageProvider.getProviderName();
        String contentType = attachment.getMimeType();
        long sizeBytes = attachment.getFileSize();

        if (attachment.getStudyDocument() != null) {
            StudyDocument sourceDoc = attachment.getStudyDocument();
            name = sourceDoc.getName();
            originalFilename = sourceDoc.getOriginalFilename();
            storagePath = sourceDoc.getStoragePath();
            storageProviderName = sourceDoc.getStorageProvider();
            contentType = sourceDoc.getContentType();
            sizeBytes = sourceDoc.getSizeBytes();
        } else if (attachment.getMetadata() != null && attachment.getMetadata().contains("storagePath")) {
            // Trích xuất storagePath từ metadata JSON
            int start = attachment.getMetadata().indexOf("\"storagePath\":\"") + 15;
            int end = attachment.getMetadata().indexOf("\"", start);
            if (start > 14 && end > start) {
                storagePath = attachment.getMetadata().substring(start, end);
            }
        }

        if (storagePath == null || storagePath.isEmpty()) {
            storagePath = attachment.getFileUrl();
        }

        StudyDocument savedCopy = StudyDocument.builder()
                .user(currentUser)
                .name(name)
                .originalFilename(originalFilename)
                .storagePath(storagePath)
                .storageProvider(storageProviderName)
                .contentType(contentType)
                .sizeBytes(sizeBytes)
                .isFolder(false)
                .parent(null)
                .isFavorite(false)
                .isDeleted(false)
                .build();

        StudyDocument result = studyDocumentRepository.save(savedCopy);
        log.info("Người dùng [{}] đã lưu tài liệu [{}] vào thư viện cá nhân thành công", currentUser.getEmail(), name);
        return documentService.mapToDto(result);
    }

    private AttachmentType determineAttachmentType(String mimeType, String filename) {
        if (mimeType != null) {
            String lower = mimeType.toLowerCase();
            if (lower.startsWith("image/")) return AttachmentType.IMAGE;
            if (lower.startsWith("video/")) return AttachmentType.VIDEO;
            if (lower.startsWith("audio/")) return AttachmentType.AUDIO;
        }
        if (filename != null) {
            String lower = filename.toLowerCase();
            if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif") || lower.endsWith(".webp")) {
                return AttachmentType.IMAGE;
            }
            if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".avi") || lower.endsWith(".mkv") || lower.endsWith(".webm")) {
                return AttachmentType.VIDEO;
            }
            if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".ogg") || lower.endsWith(".m4a")) {
                return AttachmentType.AUDIO;
            }
        }
        return AttachmentType.DOCUMENT;
    }
}
