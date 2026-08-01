package com.studytracker.service.storage;

import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.sas.BlobSasPermission;
import com.azure.storage.blob.sas.BlobServiceSasSignatureValues;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.time.OffsetDateTime;

@Slf4j
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "azure", matchIfMissing = true)
public class AzureBlobDocumentStorageProvider implements DocumentStorageProvider {

    @Value("${app.storage.azure.connection-string:}")
    private String connectionString;

    @Value("${app.storage.azure.container-name:study-documents}")
    private String containerName;

    private BlobContainerClient containerClient;

    @PostConstruct
    public void init() {
        if (connectionString != null && !connectionString.trim().isEmpty()) {
            try {
                BlobServiceClient serviceClient = new BlobServiceClientBuilder()
                        .connectionString(connectionString)
                        .buildClient();
                this.containerClient = serviceClient.getBlobContainerClient(containerName);
                if (!containerClient.exists()) {
                    containerClient.create();
                    log.info("Created Azure Blob Container: {}", containerName);
                }
            } catch (Exception e) {
                log.error("Failed to initialize Azure Blob Storage Client: {}", e.getMessage());
            }
        } else {
            log.warn("AZURE_STORAGE_CONNECTION_STRING is not configured. Azure Blob Storage operations will throw exception until configured.");
        }
    }

    private BlobContainerClient getContainerClient() {
        if (containerClient == null) {
            if (connectionString != null && !connectionString.trim().isEmpty()) {
                init();
            }
            if (containerClient == null) {
                throw new IllegalStateException("Azure Blob Storage is not configured. Please set AZURE_STORAGE_CONNECTION_STRING.");
            }
        }
        return containerClient;
    }

    @Override
    public String upload(MultipartFile file, String targetPath) {
        try {
            BlobClient blobClient = getContainerClient().getBlobClient(targetPath);
            BlobHttpHeaders headers = new BlobHttpHeaders();
            if (file.getContentType() != null) {
                headers.setContentType(file.getContentType());
            }

            blobClient.upload(file.getInputStream(), file.getSize(), true);
            blobClient.setHttpHeaders(headers);

            log.info("Successfully uploaded file to Azure Blob: {}", targetPath);
            return targetPath;
        } catch (Exception e) {
            log.error("Failed to upload file to Azure Blob: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi khi tải file lên Azure Storage: " + e.getMessage(), e);
        }
    }

    @Override
    public String generateDownloadUrl(String targetPath, String originalFilename, int expiryMinutes) {
        try {
            BlobClient blobClient = getContainerClient().getBlobClient(targetPath);
            if (!blobClient.exists()) {
                throw new IllegalArgumentException("File không tồn tại trên Azure Storage.");
            }

            // For avatars / public assets (expiryMinutes <= 0), generate a 10-year SAS read URL (5,256,000 minutes = 10 years)
            // This ensures avatars load 100% reliably on Production even if Azure Storage Account has "Allow Blob public access" disabled!
            int effectiveExpiry = expiryMinutes > 0 ? expiryMinutes : 5256000;

            BlobSasPermission permission = new BlobSasPermission().setReadPermission(true);
            OffsetDateTime expiryTime = OffsetDateTime.now().plusMinutes(effectiveExpiry);

            BlobServiceSasSignatureValues values = new BlobServiceSasSignatureValues(expiryTime, permission)
                    .setStartTime(OffsetDateTime.now().minusMinutes(5));

            if (originalFilename != null && !originalFilename.trim().isEmpty()) {
                String encodedFilename = java.net.URLEncoder.encode(originalFilename.trim(), java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
                String contentDisposition = "attachment; filename=\"" + encodedFilename + "\"; filename*=UTF-8''" + encodedFilename;
                values.setContentDisposition(contentDisposition);
            }

            String sasToken = blobClient.generateSas(values);
            return blobClient.getBlobUrl() + "?" + sasToken;
        } catch (Exception e) {
            log.error("Failed to generate Azure SAS URL for path {}: {}", targetPath, e.getMessage());
            return null; // Fallback to stream endpoint
        }
    }

    @Override
    public InputStream downloadStream(String targetPath) {
        try {
            BlobClient blobClient = getContainerClient().getBlobClient(targetPath);
            if (!blobClient.exists()) {
                throw new IllegalArgumentException("File không tồn tại trên Azure Storage.");
            }
            return blobClient.openInputStream();
        } catch (Exception e) {
            log.error("Failed to open stream for Azure Blob path {}: {}", targetPath, e.getMessage());
            throw new RuntimeException("Không thể đọc file từ Azure Storage: " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String targetPath) {
        try {
            BlobClient blobClient = getContainerClient().getBlobClient(targetPath);
            if (blobClient.exists()) {
                blobClient.delete();
                log.info("Successfully deleted Azure Blob: {}", targetPath);
            }
        } catch (Exception e) {
            log.error("Failed to delete Azure Blob path {}: {}", targetPath, e.getMessage());
        }
    }

    @Override
    public String getProviderName() {
        return "AZURE";
    }
}
