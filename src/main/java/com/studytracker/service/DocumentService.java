package com.studytracker.service;

import com.studytracker.dto.*;
import com.studytracker.model.StudyDocument;
import com.studytracker.model.User;
import com.studytracker.repository.StudyDocumentRepository;
import com.studytracker.repository.UserRepository;
import com.studytracker.service.storage.DocumentStorageProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.text.DecimalFormat;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final StudyDocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final DocumentStorageProvider storageProvider;

    @Value("${app.storage.max-user-quota-mb:1000}")
    private long maxUserQuotaMb;

    @Value("${app.storage.max-file-size-mb:200}")
    private long maxFileSizeMb;

    @Value("${app.storage.azure.sas-expiry-minutes:60}")
    private int sasExpiryMinutes;

    private User getUserEntity(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId));
    }

    private StudyDocument getDocumentEntity(Long documentId, UUID userId) {
        StudyDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại: " + documentId));
        if (!document.getUser().getId().equals(userId)) {
            throw new SecurityException("Bạn không có quyền truy cập tài liệu này");
        }
        return document;
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> getDocuments(UUID userId, Long parentId) {
        List<StudyDocument> documents;
        if (parentId == null) {
            documents = documentRepository.findByUserIdAndParentIsNullAndIsDeletedFalseOrderByIdDesc(userId);
        } else {
            getDocumentEntity(parentId, userId);
            documents = documentRepository.findByUserIdAndParentIdAndIsDeletedFalseOrderByIdDesc(userId, parentId);
        }
        return documents.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> getTrash(UUID userId) {
        return documentRepository.findTopLevelTrashItems(userId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> getFavorites(UUID userId) {
        return documentRepository.findByUserIdAndIsFavoriteTrueAndIsDeletedFalseOrderByIdDesc(userId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> searchDocuments(UUID userId, String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return documentRepository.searchByName(userId, keyword.trim())
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional
    public DocumentDto createFolder(UUID userId, CreateFolderRequest request) {
        User user = getUserEntity(userId);
        String folderName = request.getName().trim();

        StudyDocument parent = null;
        if (request.getParentId() != null) {
            parent = getDocumentEntity(request.getParentId(), userId);
            if (!parent.getIsFolder()) {
                throw new IllegalArgumentException("Mục cha không phải là thư mục");
            }
            if (documentRepository.existsByUserIdAndParentIdAndNameAndIsDeletedFalse(userId, parent.getId(), folderName)) {
                throw new IllegalArgumentException("Thư mục tên '" + folderName + "' đã tồn tại trong thư mục này");
            }
        } else {
            if (documentRepository.existsByUserIdAndParentIsNullAndNameAndIsDeletedFalse(userId, folderName)) {
                throw new IllegalArgumentException("Thư mục tên '" + folderName + "' đã tồn tại ở gốc");
            }
        }

        StudyDocument folder = StudyDocument.builder()
                .user(user)
                .name(folderName)
                .isFolder(true)
                .parent(parent)
                .sizeBytes(0L)
                .storageProvider(storageProvider.getProviderName())
                .build();

        StudyDocument saved = documentRepository.save(folder);
        log.info("Created folder '{}' for user ID {}", folderName, userId);
        return mapToDto(saved);
    }

    @Transactional
    public DocumentDto uploadFile(UUID userId, MultipartFile file, Long parentId) {
        User user = getUserEntity(userId);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File tải lên không được để trống");
        }

        // 1. Check max file size (200 MB limit)
        long fileSizeBytes = file.getSize();
        long maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
        if (fileSizeBytes > maxFileSizeBytes) {
            throw new IllegalArgumentException("File vượt quá kích thước cho phép (" + maxFileSizeMb + " MB)");
        }

        // 2. Check total user storage quota (1 GB = 1000 MB limit)
        Long currentUsedBytes = documentRepository.sumSizeBytesByUserIdAndIsDeletedFalse(userId);
        if (currentUsedBytes == null) currentUsedBytes = 0L;

        long maxQuotaBytes = maxUserQuotaMb * 1024 * 1024;
        if (currentUsedBytes + fileSizeBytes > maxQuotaBytes) {
            throw new IllegalArgumentException("Dung lượng lưu trữ của bạn đã đầy (Tối đa " + maxUserQuotaMb + " MB)");
        }

        // 3. Parent folder validation
        StudyDocument parent = null;
        if (parentId != null) {
            parent = getDocumentEntity(parentId, userId);
            if (!parent.getIsFolder()) {
                throw new IllegalArgumentException("Mục cha không phải là thư mục");
            }
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.trim().isEmpty()) {
            originalFilename = "unnamed_file";
        }
        originalFilename = originalFilename.trim();

        // 4. Generate unique storage path
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        String sanitizedName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String storagePath = "users/" + userId + "/" + System.currentTimeMillis() + "_" + uuid + "_" + sanitizedName;

        // 5. Upload to storage provider
        storageProvider.upload(file, storagePath);

        // 6. Save metadata to DB
        StudyDocument document = StudyDocument.builder()
                .user(user)
                .name(originalFilename)
                .originalFilename(originalFilename)
                .storagePath(storagePath)
                .storageProvider(storageProvider.getProviderName())
                .contentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .sizeBytes(fileSizeBytes)
                .isFolder(false)
                .parent(parent)
                .build();

        StudyDocument saved = documentRepository.save(document);
        log.info("Uploaded document ID {} ({}) for user ID {}", saved.getId(), originalFilename, userId);
        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public String getDownloadUrl(Long documentId, UUID userId) {
        StudyDocument document = getDocumentEntity(documentId, userId);
        if (document.getIsFolder()) {
            throw new IllegalArgumentException("Không thể tải về trực tiếp thư mục");
        }
        return storageProvider.generateDownloadUrl(document.getStoragePath(), document.getName(), sasExpiryMinutes);
    }

    @Transactional(readOnly = true)
    public InputStream getDownloadStream(Long documentId, UUID userId) {
        StudyDocument document = getDocumentEntity(documentId, userId);
        if (document.getIsFolder()) {
            throw new IllegalArgumentException("Không thể stream thư mục");
        }
        return storageProvider.downloadStream(document.getStoragePath());
    }

    @Transactional(readOnly = true)
    public StudyDocument getDocumentForStream(Long documentId, UUID userId) {
        return getDocumentEntity(documentId, userId);
    }

    @Transactional
    public DocumentDto renameDocument(Long documentId, UUID userId, RenameDocumentRequest request) {
        StudyDocument document = getDocumentEntity(documentId, userId);
        String newName = request.getName().trim();

        if (newName.isEmpty()) {
            throw new IllegalArgumentException("Tên mới không được trống");
        }

        document.setName(newName);
        StudyDocument updated = documentRepository.save(document);
        return mapToDto(updated);
    }

    @Transactional
    public DocumentDto toggleFavorite(Long documentId, UUID userId) {
        StudyDocument document = getDocumentEntity(documentId, userId);
        document.setIsFavorite(!Boolean.TRUE.equals(document.getIsFavorite()));
        StudyDocument updated = documentRepository.save(document);
        return mapToDto(updated);
    }

    @Transactional
    public void softDelete(Long documentId, UUID userId) {
        StudyDocument document = getDocumentEntity(documentId, userId);
        markAsDeleted(document);
    }

    private void markAsDeleted(StudyDocument doc) {
        doc.setIsDeleted(true);
        doc.setDeletedAt(LocalDateTime.now());
        documentRepository.save(doc);

        if (Boolean.TRUE.equals(doc.getIsFolder())) {
            List<StudyDocument> children = documentRepository.findByParentIdAndIsDeletedFalse(doc.getId());
            for (StudyDocument child : children) {
                markAsDeleted(child);
            }
        }
    }

    @Transactional
    public void restoreDocument(Long documentId, UUID userId) {
        StudyDocument document = getDocumentEntity(documentId, userId);
        restoreRecursive(document);
    }

    private void restoreRecursive(StudyDocument doc) {
        doc.setIsDeleted(false);
        doc.setDeletedAt(null);
        documentRepository.save(doc);

        if (Boolean.TRUE.equals(doc.getIsFolder())) {
            List<StudyDocument> children = documentRepository.findByParentId(doc.getId());
            for (StudyDocument child : children) {
                restoreRecursive(child);
            }
        }
    }

    @Transactional
    public void permanentDelete(Long documentId, UUID userId) {
        StudyDocument document = getDocumentEntity(documentId, userId);
        deleteRecursive(document);
    }

    private void deleteRecursive(StudyDocument doc) {
        if (Boolean.TRUE.equals(doc.getIsFolder())) {
            List<StudyDocument> children = documentRepository.findByParentId(doc.getId());
            for (StudyDocument child : children) {
                deleteRecursive(child);
            }
        } else {
            if (doc.getStoragePath() != null && !doc.getStoragePath().trim().isEmpty()) {
                try {
                    storageProvider.delete(doc.getStoragePath());
                    log.info("Permanently deleted storage blob for document ID {} at path: {}", doc.getId(), doc.getStoragePath());
                } catch (Exception e) {
                    log.error("Failed to delete storage blob for path {}: {}", doc.getStoragePath(), e.getMessage(), e);
                }
            }
        }
        documentRepository.delete(doc);
    }

    @Transactional(readOnly = true)
    public StorageQuotaDto getStorageQuota(UUID userId) {
        Long usedBytes = documentRepository.sumSizeBytesByUserIdAndIsDeletedFalse(userId);
        if (usedBytes == null) usedBytes = 0L;

        long maxBytes = maxUserQuotaMb * 1024 * 1024;
        long maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
        double usagePercentage = (maxBytes > 0) ? ((double) usedBytes / maxBytes) * 100.0 : 0.0;

        return StorageQuotaDto.builder()
                .usedBytes(usedBytes)
                .maxBytes(maxBytes)
                .usagePercentage(Math.min(100.0, Math.round(usagePercentage * 100.0) / 100.0))
                .formattedUsed(formatBytes(usedBytes))
                .formattedMax(formatBytes(maxBytes))
                .maxFileSizeBytes(maxFileSizeBytes)
                .formattedMaxFileSize(formatBytes(maxFileSizeBytes))
                .build();
    }

    public DocumentDto mapToDto(StudyDocument doc) {
        return DocumentDto.builder()
                .id(doc.getId())
                .name(doc.getName())
                .originalFilename(doc.getOriginalFilename())
                .storagePath(doc.getStoragePath())
                .storageProvider(doc.getStorageProvider())
                .contentType(doc.getContentType())
                .sizeBytes(doc.getSizeBytes())
                .isFolder(doc.getIsFolder())
                .parentId(doc.getParent() != null ? doc.getParent().getId() : null)
                .parentName(doc.getParent() != null ? doc.getParent().getName() : null)
                .isFavorite(doc.getIsFavorite())
                .isDeleted(doc.getIsDeleted())
                .deletedAt(doc.getDeletedAt())
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .build();
    }

    private String formatBytes(long bytes) {
        if (bytes <= 0) return "0 B";
        final String[] units = new String[]{"B", "KB", "MB", "GB", "TB"};
        int digitGroups = (int) (Math.log10(bytes) / Math.log10(1024));
        return new DecimalFormat("#,##0.#").format(bytes / Math.pow(1024, digitGroups)) + " " + units[digitGroups];
    }
}
