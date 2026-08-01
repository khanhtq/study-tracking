package com.studytracker.controller;

import com.studytracker.dto.*;
import com.studytracker.model.StudyDocument;
import com.studytracker.model.User;
import com.studytracker.service.DocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @GetMapping
    public ResponseEntity<List<DocumentDto>> getDocuments(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Long parentId
    ) {
        return ResponseEntity.ok(documentService.getDocuments(user.getId(), parentId));
    }

    @PostMapping("/upload")
    public ResponseEntity<DocumentDto> uploadFile(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long parentId
    ) {
        return ResponseEntity.ok(documentService.uploadFile(user.getId(), file, parentId));
    }

    @PostMapping("/folder")
    public ResponseEntity<DocumentDto> createFolder(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateFolderRequest request
    ) {
        return ResponseEntity.ok(documentService.createFolder(user.getId(), request));
    }

    @GetMapping("/{id}/download-url")
    public ResponseEntity<Map<String, String>> getDownloadUrl(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        String url = documentService.getDownloadUrl(id, user.getId());
        Map<String, String> response = new HashMap<>();
        response.put("downloadUrl", url);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/stream")
    public ResponseEntity<Resource> streamDocument(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        StudyDocument doc = documentService.getDocumentForStream(id, user.getId());
        InputStream inputStream = documentService.getDownloadStream(id, user.getId());

        String encodedFilename = URLEncoder.encode(doc.getName(), StandardCharsets.UTF_8).replace("+", "%20");
        String contentDisposition = "attachment; filename=\"" + encodedFilename + "\"; filename*=UTF-8''" + encodedFilename;

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(doc.getContentType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                .body(new InputStreamResource(inputStream));
    }

    @PutMapping("/{id}/rename")
    public ResponseEntity<DocumentDto> renameDocument(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody RenameDocumentRequest request
    ) {
        return ResponseEntity.ok(documentService.renameDocument(id, user.getId(), request));
    }

    @PostMapping("/{id}/favorite")
    public ResponseEntity<DocumentDto> toggleFavorite(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(documentService.toggleFavorite(id, user.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> softDelete(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        documentService.softDelete(id, user.getId());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã chuyển tài liệu vào thùng rác");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<Map<String, String>> restoreDocument(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        documentService.restoreDocument(id, user.getId());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã khôi phục tài liệu");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Map<String, String>> permanentDelete(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        documentService.permanentDelete(id, user.getId());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã xóa vĩnh viễn tài liệu");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/trash")
    public ResponseEntity<List<DocumentDto>> getTrash(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(documentService.getTrash(user.getId()));
    }

    @GetMapping("/favorites")
    public ResponseEntity<List<DocumentDto>> getFavorites(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(documentService.getFavorites(user.getId()));
    }

    @GetMapping("/search")
    public ResponseEntity<List<DocumentDto>> searchDocuments(
            @AuthenticationPrincipal User user,
            @RequestParam("q") String query
    ) {
        return ResponseEntity.ok(documentService.searchDocuments(user.getId(), query));
    }

    @GetMapping("/storage")
    public ResponseEntity<StorageQuotaDto> getStorageQuota(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(documentService.getStorageQuota(user.getId()));
    }
}
