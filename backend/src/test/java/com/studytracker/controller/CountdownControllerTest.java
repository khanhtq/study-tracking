package com.studytracker.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studytracker.config.JwtTokenProvider;
import com.studytracker.dto.CountdownDto;
import com.studytracker.dto.CreateCountdownRequest;
import com.studytracker.model.User;
import com.studytracker.repository.UserRepository;
import com.studytracker.service.CountdownService;
import com.studytracker.util.CookieUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import javax.sql.DataSource;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = CountdownController.class)
@AutoConfigureMockMvc(addFilters = false)
public class CountdownControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CountdownService countdownService;

    @MockBean
    private DataSource dataSource;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CookieUtil cookieUtil;

    private User testUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        testUser = User.builder()
                .id(userId)
                .email("student@test.com")
                .displayName("Student Test")
                .build();

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(testUser, null, testUser.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("POST /api/countdowns - Lưu sự kiện theo dõi mới thành công")
    void shouldCreateCountdownSuccessfully() throws Exception {
        CreateCountdownRequest request = CreateCountdownRequest.builder()
                .presetExamCode("THPT_QG_2027")
                .title("Kỳ thi Tốt nghiệp THPT Quốc Gia 2027")
                .targetDate(Instant.parse("2027-06-25T07:30:00.000Z"))
                .isPinned(true)
                .build();

        CountdownDto mockDto = CountdownDto.builder()
                .id(UUID.randomUUID())
                .presetExamCode("THPT_QG_2027")
                .title(request.getTitle())
                .targetDate(request.getTargetDate())
                .isPinned(true)
                .build();

        when(countdownService.createCountdown(eq(userId), any(CreateCountdownRequest.class)))
                .thenReturn(mockDto);

        mockMvc.perform(post("/api/countdowns")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.presetExamCode").value("THPT_QG_2027"))
                .andExpect(jsonPath("$.title").value("Kỳ thi Tốt nghiệp THPT Quốc Gia 2027"))
                .andExpect(jsonPath("$.isPinned").value(true));
    }

    @Test
    @DisplayName("GET /api/countdowns - Lấy danh sách tất cả các sự kiện người dùng đang theo dõi")
    void shouldGetUserCountdownsSuccessfully() throws Exception {
        CountdownDto dto1 = CountdownDto.builder()
                .id(UUID.randomUUID())
                .presetExamCode("THPT_QG_2027")
                .title("THPT QG 2027")
                .targetDate(Instant.parse("2027-06-25T07:30:00.000Z"))
                .isPinned(true)
                .build();

        CountdownDto dto2 = CountdownDto.builder()
                .id(UUID.randomUUID())
                .presetExamCode("DGNL_HCMUT_2027")
                .title("DGNL HCMUT 2027")
                .targetDate(Instant.parse("2027-04-04T07:30:00.000Z"))
                .isPinned(false)
                .build();

        when(countdownService.getUserCountdowns(userId)).thenReturn(List.of(dto1, dto2));

        mockMvc.perform(get("/api/countdowns")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].presetExamCode").value("THPT_QG_2027"))
                .andExpect(jsonPath("$[1].presetExamCode").value("DGNL_HCMUT_2027"));
    }

    @Test
    @DisplayName("PATCH /api/countdowns/{id}/pin - Ghim sự kiện theo dõi lên Widget")
    void shouldPinCountdownSuccessfully() throws Exception {
        UUID eventId = UUID.randomUUID();
        CountdownDto pinnedDto = CountdownDto.builder()
                .id(eventId)
                .presetExamCode("DGNL_HCMUT_2027")
                .title("DGNL HCMUT 2027")
                .isPinned(true)
                .build();

        when(countdownService.pinCountdown(userId, eventId.toString())).thenReturn(pinnedDto);

        mockMvc.perform(patch("/api/countdowns/" + eventId + "/pin")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPinned").value(true));

        verify(countdownService).pinCountdown(userId, eventId.toString());
    }

    @Test
    @DisplayName("DELETE /api/countdowns/{id} - Xóa/Hủy theo dõi sự kiện")
    void shouldDeleteCountdownSuccessfully() throws Exception {
        UUID eventId = UUID.randomUUID();

        mockMvc.perform(delete("/api/countdowns/" + eventId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        verify(countdownService).deleteCountdown(userId, eventId.toString());
    }
}
