package com.studytracker.controller;

import com.studytracker.dto.DocumentDto;
import com.studytracker.dto.GroupMessageDto;
import com.studytracker.dto.MessageAttachmentDto;
import com.studytracker.dto.ShareStudyDocumentRequest;
import com.studytracker.model.User;
import com.studytracker.service.ChatMediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Tag(name = "Chat Media & Attachments", description = "APIs Tải tệp đa phương tiện Azure Blob và Chia sẻ tài liệu học tập")
@RestController
@RequestMapping("/api/v1/chat/groups/{groupId}")
@RequiredArgsConstructor
public class ChatMediaController {

    private final ChatMediaService chatMediaService;

    @Operation(summary = "Tải tệp đa phương tiện lên Azure Blob Storage cho phòng chat")
    @PostMapping(value = "/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MessageAttachmentDto> uploadChatFile(
            @PathVariable("groupId") UUID groupId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatMediaService.uploadChatFile(groupId, currentUser, file));
    }

    @Operation(summary = "Chia sẻ tài liệu học tập từ kho cá nhân vào phòng chat")
    @PostMapping("/share-document")
    public ResponseEntity<GroupMessageDto> shareStudyDocument(
            @PathVariable("groupId") UUID groupId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ShareStudyDocumentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                chatMediaService.shareStudyDocument(groupId, currentUser, request.getDocumentId(), request.getCaption())
        );
    }

    @Operation(summary = "Lưu tài liệu được chia sẻ trong chat về kho tài liệu cá nhân (1-Click Save)")
    @PostMapping("/save-document/{attachmentId}")
    public ResponseEntity<DocumentDto> saveSharedDocumentToMyLibrary(
            @PathVariable("groupId") UUID groupId,
            @PathVariable("attachmentId") UUID attachmentId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(chatMediaService.saveSharedDocumentToMyLibrary(groupId, currentUser, attachmentId));
    }
}
