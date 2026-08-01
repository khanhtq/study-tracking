package com.studytracker.service.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Slf4j
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local")
public class LocalDocumentStorageProvider implements DocumentStorageProvider {

    @Value("${app.storage.upload-dir:uploads}")
    private String uploadDir;

    @Override
    public String upload(MultipartFile file, String targetPath) {
        try {
            Path destination = Paths.get(uploadDir, targetPath).toAbsolutePath().normalize();
            Files.createDirectories(destination.getParent());
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            log.info("Successfully uploaded file locally: {}", destination);
            return targetPath;
        } catch (Exception e) {
            log.error("Failed to store file locally: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi lưu trữ file cục bộ: " + e.getMessage(), e);
        }
    }

    @Override
    public String generateDownloadUrl(String targetPath, String originalFilename, int expiryMinutes) {
        // Local storage does not generate external SAS URL; returns null to trigger server streaming download
        return null;
    }

    @Override
    public InputStream downloadStream(String targetPath) {
        try {
            Path filePath = Paths.get(uploadDir, targetPath).toAbsolutePath().normalize();
            File file = filePath.toFile();
            if (!file.exists()) {
                throw new IllegalArgumentException("File không tồn tại trên hệ thống local.");
            }
            return new FileInputStream(file);
        } catch (Exception e) {
            log.error("Failed to open stream for local file {}: {}", targetPath, e.getMessage());
            throw new RuntimeException("Không thể đọc file cục bộ: " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String targetPath) {
        try {
            Path filePath = Paths.get(uploadDir, targetPath).toAbsolutePath().normalize();
            Files.deleteIfExists(filePath);
            log.info("Successfully deleted local file: {}", filePath);
        } catch (Exception e) {
            log.error("Failed to delete local file {}: {}", targetPath, e.getMessage());
        }
    }

    @Override
    public String getProviderName() {
        return "LOCAL";
    }
}
