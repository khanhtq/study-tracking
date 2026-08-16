package com.studytracker.service;

import com.studytracker.dto.DocumentDto;
import com.studytracker.dto.GroupMessageDto;
import com.studytracker.dto.MessageAttachmentDto;
import com.studytracker.model.*;
import com.studytracker.repository.MessageAttachmentRepository;
import com.studytracker.repository.StudyDocumentRepository;
import com.studytracker.service.storage.DocumentStorageProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ChatMediaServiceTest {

    @Mock
    private DocumentStorageProvider storageProvider;

    @Mock
    private MessageAttachmentRepository messageAttachmentRepository;

    @Mock
    private StudyDocumentRepository studyDocumentRepository;

    @Mock
    private GroupService groupService;

    @Mock
    private ChatRealtimeService chatRealtimeService;

    @Mock
    private DocumentService documentService;

    @InjectMocks
    private ChatMediaService chatMediaService;

    private User testUser;
    private UUID groupId;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("student@study.com")
                .displayName("Student Test")
                .build();
        groupId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Upload file lên Azure Blob Storage và nhận SAS URL thành công")
    void shouldUploadFileAndReturnSasUrl() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test-image.png",
                "image/png",
                "dummy image content".getBytes()
        );

        when(storageProvider.generateDownloadUrl(any(), eq("test-image.png"), eq(0)))
                .thenReturn("https://storage.blob.core.windows.net/study-documents/chat/test-image.png?sas_token=xyz");

        MessageAttachmentDto result = chatMediaService.uploadChatFile(groupId, testUser, file);

        assertNotNull(result);
        assertEquals("test-image.png", result.getFileName());
        assertEquals(AttachmentType.IMAGE, result.getAttachmentType());
        assertTrue(result.getFileUrl().contains("sas_token=xyz"));
        verify(storageProvider, times(1)).upload(eq(file), any());
    }

    @Test
    @DisplayName("Chia sẻ tài liệu học tập từ thư viện cá nhân vào nhóm chat thành công")
    void shouldShareStudyDocumentSuccessfully() {
        Long docId = 101L;
        StudyDocument doc = StudyDocument.builder()
                .id(docId)
                .user(testUser)
                .name("Tai-Lieu-On-Thi.pdf")
                .originalFilename("Tai-Lieu-On-Thi.pdf")
                .storagePath("users/123/doc.pdf")
                .contentType("application/pdf")
                .sizeBytes(1024L)
                .isFolder(false)
                .isDeleted(false)
                .build();

        when(studyDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(storageProvider.generateDownloadUrl(eq("users/123/doc.pdf"), eq("Tai-Lieu-On-Thi.pdf"), eq(0)))
                .thenReturn("https://storage.blob.core.windows.net/study-documents/users/123/doc.pdf?sas=123");

        GroupMessageDto mockMsg = GroupMessageDto.builder()
                .id(UUID.randomUUID())
                .groupId(groupId)
                .content("Mọi người xem tài liệu này nhé!")
                .build();

        when(chatRealtimeService.sendMessage(eq(groupId), eq(testUser), any())).thenReturn(mockMsg);

        GroupMessageDto result = chatMediaService.shareStudyDocument(groupId, testUser, docId, "Mọi người xem tài liệu này nhé!");

        assertNotNull(result);
        verify(chatRealtimeService, times(1)).sendMessage(eq(groupId), eq(testUser), any());
    }

    @Test
    @DisplayName("1-Click lưu tài liệu chia sẻ trong chat về thư viện cá nhân thành công")
    void shouldSaveSharedDocumentToPersonalLibrary() {
        UUID attachmentId = UUID.randomUUID();
        StudyDocument sourceDoc = StudyDocument.builder()
                .id(202L)
                .name("Shared-Notes.docx")
                .originalFilename("Shared-Notes.docx")
                .storagePath("chat/group1/doc.docx")
                .storageProvider("AZURE")
                .contentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                .sizeBytes(2048L)
                .build();

        MessageAttachment attachment = MessageAttachment.builder()
                .id(attachmentId)
                .studyDocument(sourceDoc)
                .fileName("Shared-Notes.docx")
                .fileSize(2048L)
                .mimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                .build();

        when(messageAttachmentRepository.findById(attachmentId)).thenReturn(Optional.of(attachment));
        when(storageProvider.getProviderName()).thenReturn("AZURE");
        when(studyDocumentRepository.save(any(StudyDocument.class))).thenAnswer(invocation -> {
            StudyDocument d = invocation.getArgument(0);
            d.setId(303L);
            return d;
        });

        DocumentDto expectedDto = DocumentDto.builder()
                .id(303L)
                .name("Shared-Notes.docx")
                .build();
        when(documentService.mapToDto(any())).thenReturn(expectedDto);

        DocumentDto result = chatMediaService.saveSharedDocumentToMyLibrary(groupId, testUser, attachmentId);

        assertNotNull(result);
        assertEquals(303L, result.getId());
        assertEquals("Shared-Notes.docx", result.getName());
        verify(studyDocumentRepository, times(1)).save(any(StudyDocument.class));
    }
}
