package com.studytracker.service.storage;

import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;

public interface DocumentStorageProvider {
    /**
     * Upload file to storage provider.
     * @param file uploaded file
     * @param targetPath relative path inside storage (e.g., "users/123/uuid-file.pdf")
     * @return resulting storage path or URL
     */
    String upload(MultipartFile file, String targetPath);

    /**
     * Generate a temporary download or view URL (e.g. SAS token for Azure, Presigned URL for S3)
     * with custom Content-Disposition header so original filename is preserved.
     */
    String generateDownloadUrl(String targetPath, String originalFilename, int expiryMinutes);

    /**
     * Get input stream for direct streaming download via backend controller.
     */
    InputStream downloadStream(String targetPath);

    /**
     * Delete file from storage provider.
     */
    void delete(String targetPath);

    /**
     * Provider identifier (e.g., "AZURE", "LOCAL", "CLOUDINARY").
     */
    String getProviderName();
}
