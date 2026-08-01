package com.studytracker.service.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageProvider {
    /**
     * Store a file and return the accessible URL or path.
     */
    String store(MultipartFile file, String subDirectory);

    /**
     * Load a file as a Spring Resource.
     */
    Resource loadAsResource(String filename, String subDirectory);

    /**
     * Delete a stored file.
     */
    void delete(String fileUrl);
}
