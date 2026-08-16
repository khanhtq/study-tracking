package com.studytracker.service;

import com.studytracker.dto.GroupMessageDto;
import com.studytracker.dto.MessagesCursorPageResponse;
import com.studytracker.dto.ReactionUpdateDto;
import com.studytracker.dto.SendMessagePayload;
import com.studytracker.model.*;
import com.studytracker.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ChatRealtimeServiceTest {

    @Mock
    private GroupMessageRepository groupMessageRepository;

    @Mock
    private ChatGroupRepository chatGroupRepository;

    @Mock
    private GroupMemberRepository groupMemberRepository;

    @Mock
    private MessageAttachmentRepository messageAttachmentRepository;

    @Mock
    private MessageReactionRepository messageReactionRepository;

    @Mock
    private GroupPinnedMessageRepository groupPinnedMessageRepository;

    @Mock
    private MessageMentionRepository messageMentionRepository;

    @Mock
    private StudyDocumentRepository studyDocumentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private GroupService groupService;

    @InjectMocks
    private ChatRealtimeService chatRealtimeService;

    private User testUser;
    private ChatGroup testGroup;
    private GroupMember testMember;
    private UUID groupId;
    private UUID messageId;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("student@study.com")
                .displayName("Student Test")
                .role(Role.ROLE_USER)
                .build();

        groupId = UUID.randomUUID();
        testGroup = ChatGroup.builder()
                .id(groupId)
                .name("Group Test")
                .privacy(GroupPrivacy.PUBLIC)
                .messageCount(0L)
                .build();

        testMember = GroupMember.builder()
                .id(UUID.randomUUID())
                .group(testGroup)
                .user(testUser)
                .role(GroupRole.MEMBER)
                .status(GroupMemberStatus.ACTIVE)
                .build();

        messageId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Gửi tin nhắn realtime thành công và broadcast qua STOMP")
    void shouldSendMessageAndBroadcast() {
        SendMessagePayload payload = SendMessagePayload.builder()
                .content("Xin chào cả nhóm!")
                .messageType(GroupMessageType.TEXT)
                .build();

        when(chatGroupRepository.findById(groupId)).thenReturn(Optional.of(testGroup));
        when(groupMemberRepository.findByGroupIdAndUserId(groupId, testUser.getId())).thenReturn(Optional.of(testMember));

        when(groupMessageRepository.save(any(GroupMessage.class))).thenAnswer(invocation -> {
            GroupMessage m = invocation.getArgument(0);
            m.setId(messageId);
            m.setCreatedAt(Instant.now());
            return m;
        });

        when(messageAttachmentRepository.findByMessageId(any())).thenReturn(Collections.emptyList());
        when(messageReactionRepository.findByMessageId(any())).thenReturn(Collections.emptyList());

        GroupMessageDto result = chatRealtimeService.sendMessage(groupId, testUser, payload);

        assertNotNull(result);
        assertEquals("Xin chào cả nhóm!", result.getContent());
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/group." + groupId + ".messages"), any(GroupMessageDto.class));
    }

    @Test
    @DisplayName("Chỉnh sửa tin nhắn không giới hạn thời gian và đánh dấu isEdited = true")
    void shouldEditMessageSuccessfully() {
        GroupMessage existingMessage = GroupMessage.builder()
                .id(messageId)
                .group(testGroup)
                .sender(testUser)
                .content("Tin nhắn cũ")
                .isEdited(false)
                .isDeleted(false)
                .build();

        when(groupMessageRepository.findById(messageId)).thenReturn(Optional.of(existingMessage));
        when(groupMessageRepository.save(any(GroupMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageAttachmentRepository.findByMessageId(messageId)).thenReturn(Collections.emptyList());
        when(messageReactionRepository.findByMessageId(messageId)).thenReturn(Collections.emptyList());

        GroupMessageDto result = chatRealtimeService.editMessage(groupId, testUser, messageId, "Tin nhắn đã sửa");

        assertNotNull(result);
        assertEquals("Tin nhắn đã sửa", result.getContent());
        assertTrue(result.getIsEdited());
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/group." + groupId + ".messages"), any(GroupMessageDto.class));
    }

    @Test
    @DisplayName("Thả reaction realtime cập nhật và broadcast qua STOMP reactions")
    void shouldToggleReactionSuccessfully() {
        GroupMessage message = GroupMessage.builder()
                .id(messageId)
                .group(testGroup)
                .sender(testUser)
                .build();

        when(groupMessageRepository.findById(messageId)).thenReturn(Optional.of(message));
        when(messageReactionRepository.findByMessageIdAndUserIdAndEmoji(messageId, testUser.getId(), "🔥")).thenReturn(Optional.empty());

        MessageReaction savedReact = MessageReaction.builder()
                .id(UUID.randomUUID())
                .message(message)
                .user(testUser)
                .emoji("🔥")
                .build();
        when(messageReactionRepository.findByMessageId(messageId)).thenReturn(List.of(savedReact));

        ReactionUpdateDto updateDto = chatRealtimeService.toggleReaction(groupId, testUser, messageId, "🔥");

        assertNotNull(updateDto);
        assertEquals("ADD", updateDto.getAction());
        assertEquals("🔥", updateDto.getEmoji());
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/group." + groupId + ".reactions"), any(ReactionUpdateDto.class));
    }

    @Test
    @DisplayName("Lấy tin nhắn phân trang Cursor pagination thành công")
    void shouldGetMessagesWithCursorPagination() {
        GroupMessage msg = GroupMessage.builder()
                .id(messageId)
                .group(testGroup)
                .sender(testUser)
                .content("Tin nhắn số 1")
                .isDeleted(false)
                .createdAt(Instant.now())
                .build();

        when(groupMessageRepository.findLatestMessages(eq(groupId), any())).thenReturn(List.of(msg));

        MessagesCursorPageResponse response = chatRealtimeService.getMessages(groupId, null, 30, testUser);

        assertNotNull(response);
        assertEquals(1, response.getMessages().size());
        assertFalse(response.getHasMore());
    }
}
