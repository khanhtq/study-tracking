package com.studytracker.service.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@Service("cloudinaryStorageProvider")
@Primary
@Slf4j
public class CloudinaryStorageProviderImpl implements FileStorageProvider {

    private final FileStorageProvider fallbackLocalProvider;
    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;
    private Cloudinary cloudinary;

    public CloudinaryStorageProviderImpl(
            @Qualifier("localStorageProvider") FileStorageProvider fallbackLocalProvider,
            @Value("${app.storage.cloudinary.cloud-name:}") String cloudName,
            @Value("${app.storage.cloudinary.api-key:}") String apiKey,
            @Value("${app.storage.cloudinary.api-secret:}") String apiSecret) {
        this.fallbackLocalProvider = fallbackLocalProvider;
        this.cloudName = cloudName;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;

        if (isCloudinaryConfigured()) {
            try {
                Map<String, String> config = new HashMap<>();
                config.put("cloud_name", cloudName.trim());
                config.put("api_key", apiKey.trim());
                config.put("api_secret", apiSecret.trim());
                this.cloudinary = new Cloudinary(config);
                log.info("Khởi tạo Cloudinary Storage Provider thành công cho cloud_name: {}", cloudName);
            } catch (Exception e) {
                log.error("Không thể khởi tạo Cloudinary SDK, fallback về Local Storage:", e);
            }
        }
    }

    private boolean isCloudinaryConfigured() {
        return cloudName != null && !cloudName.trim().isEmpty()
                && apiKey != null && !apiKey.trim().isEmpty()
                && apiSecret != null && !apiSecret.trim().isEmpty();
    }

    @Override
    public String store(MultipartFile file, String subDirectory) {
        if (!isCloudinaryConfigured() || this.cloudinary == null) {
            log.info("[Storage Status] Cloudinary chưa cấu hình credentials. Đang lưu ảnh vào Local Storage.");
            return fallbackLocalProvider.store(file, subDirectory);
        }

        try {
            log.info("[Storage Status] Đang upload ảnh trực tiếp lên Cloudinary cloud: {}", cloudName);
            String folderName = "study_xp_tracker/" + (subDirectory != null ? subDirectory : "avatars");
                Map<String, Object> uploadParams = ObjectUtils.asMap(
                    "folder", folderName,
                    "overwrite", true,
                    "resource_type", "auto"
            );
                Map<String, Object> uploadResult = this.cloudinary.uploader().upload(file.getBytes(), uploadParams);
            String secureUrl = (String) uploadResult.get("secure_url");
            log.info("[Storage Status] Upload Cloudinary thành công! URL: {}", secureUrl);
            return secureUrl;
        } catch (Exception e) {
            log.error("[Storage Status] Lỗi khi upload Cloudinary, tự động chuyển về lưu đĩa Local:", e);
            return fallbackLocalProvider.store(file, subDirectory);
        }
    }

    @Override
    public Resource loadAsResource(String filename, String subDirectory) {
        return fallbackLocalProvider.loadAsResource(filename, subDirectory);
    }

    public static String extractPublicId(String fileUrl) {
        if (fileUrl == null || !fileUrl.contains("cloudinary.com")) {
            return null;
        }
        try {
            int uploadIndex = fileUrl.indexOf("/upload/");
            if (uploadIndex == -1) return null;
            String pathAfterUpload = fileUrl.substring(uploadIndex + "/upload/".length());
            // Strip optional version prefix v12345678/ if present
            if (pathAfterUpload.matches("^v\\d+/.*")) {
                pathAfterUpload = pathAfterUpload.substring(pathAfterUpload.indexOf("/") + 1);
            }
            // Strip file extension (.jpg, .png, etc.)
            int lastDot = pathAfterUpload.lastIndexOf('.');
            if (lastDot != -1) {
                pathAfterUpload = pathAfterUpload.substring(0, lastDot);
            }
            return pathAfterUpload;
        } catch (Exception e) {
            log.warn("Không thể bóc tách public_id từ Cloudinary URL: {}", fileUrl, e);
            return null;
        }
    }

    @Override
    public void delete(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }

        if (fileUrl.startsWith("/uploads/")) {
            fallbackLocalProvider.delete(fileUrl);
            return;
        }

        if (isCloudinaryConfigured() && this.cloudinary != null && fileUrl.contains("cloudinary.com")) {
            String publicId = extractPublicId(fileUrl);
            if (publicId != null) {
                try {
                    log.info("[Cloudinary Storage] Tự động xóa file cũ trên Cloudinary public_id: {}", publicId);
                    Map<String, Object> result = this.cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
                    log.info("[Cloudinary Storage] Kết quả xóa file cũ Cloudinary: {}", result);
                } catch (Exception e) {
                    log.error("[Cloudinary Storage] Lỗi khi xóa file cũ trên Cloudinary URL: {}", fileUrl, e);
                }
            }
        }
    }
}
