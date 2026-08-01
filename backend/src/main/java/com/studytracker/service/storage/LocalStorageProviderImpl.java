package com.studytracker.service.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service("localStorageProvider")
@Slf4j
public class LocalStorageProviderImpl implements FileStorageProvider {

    private final Path rootLocation;
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList("jpg", "jpeg", "png", "webp", "gif");

    public LocalStorageProviderImpl(@Value("${app.upload.dir:uploads}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootLocation);
        } catch (IOException e) {
            log.error("Could not initialize upload directory: {}", uploadDir, e);
        }
    }

    @Override
    public String store(MultipartFile file, String subDirectory) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Không thể tải lên file rỗng.");
        }

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "avatar.png");
        String extension = "";
        int i = originalFilename.lastIndexOf('.');
        if (i > 0) {
            extension = originalFilename.substring(i + 1).toLowerCase();
        }

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Định dạng file không hợp lệ! Chỉ chấp nhận: " + ALLOWED_EXTENSIONS);
        }

        String newFilename = UUID.randomUUID().toString() + "." + extension;
        Path targetDir = subDirectory != null && !subDirectory.isEmpty() 
                ? this.rootLocation.resolve(subDirectory) 
                : this.rootLocation;

        try {
            Files.createDirectories(targetDir);
            Path destinationFile = targetDir.resolve(Paths.get(newFilename)).normalize().toAbsolutePath();

            if (!destinationFile.getParent().equals(targetDir.toAbsolutePath())) {
                throw new SecurityException("Không thể lưu trữ file ngoài thư mục hiện tại.");
            }

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
            }

            String subPath = subDirectory != null && !subDirectory.isEmpty() ? subDirectory + "/" : "";
            return "/uploads/" + subPath + newFilename;
        } catch (IOException e) {
            log.error("Lỗi khi lưu trữ file: {}", originalFilename, e);
            throw new RuntimeException("Không thể lưu trữ file. Vui lòng thử lại sau.", e);
        }
    }

    @Override
    public Resource loadAsResource(String filename, String subDirectory) {
        try {
            Path targetDir = subDirectory != null && !subDirectory.isEmpty() 
                    ? this.rootLocation.resolve(subDirectory) 
                    : this.rootLocation;
            Path file = targetDir.resolve(filename);
            Resource resource = new UrlResource(file.toUri());

            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Không tìm thấy file: " + filename);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Đường dẫn file không hợp lệ: " + filename, e);
        }
    }

    @Override
    public void delete(String fileUrl) {
        if (fileUrl == null || !fileUrl.startsWith("/uploads/")) {
            return;
        }
        try {
            String relativePath = fileUrl.replace("/uploads/", "");
            Path filePath = this.rootLocation.resolve(relativePath).normalize().toAbsolutePath();
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.warn("Không thể xóa file cũ: {}", fileUrl, e);
        }
    }
}
