package com.studytracker.controller;

import com.studytracker.config.JwtTokenProvider;
import com.studytracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = HealthController.class)
@AutoConfigureMockMvc(addFilters = false) // Disable security filters to easily test the endpoint in isolation
public class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DataSource dataSource;

    @MockBean
    private Connection connection;

    // Mock security-related beans that are required to load the application context during WebMvcTest
    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() throws SQLException {
        reset(dataSource, connection);
        when(dataSource.getConnection()).thenReturn(connection);
    }

    @Test
    void checkHealth_ShouldReturnUp_WhenDatabaseIsHealthy() throws Exception {
        when(connection.isValid(2)).thenReturn(true);

        mockMvc.perform(get("/api/health")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.database").value("UP"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void checkHealth_ShouldReturnDown_WhenDatabaseIsUnhealthy() throws Exception {
        when(connection.isValid(2)).thenReturn(false);

        mockMvc.perform(get("/api/health")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value("DOWN"))
                .andExpect(jsonPath("$.database").value("DOWN"));
    }

    @Test
    void checkHealth_ShouldReturnDown_WhenDatabaseThrowsException() throws Exception {
        when(dataSource.getConnection()).thenThrow(new SQLException("Connection failed"));

        mockMvc.perform(get("/api/health")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value("DOWN"))
                .andExpect(jsonPath("$.database").value("DOWN"))
                .andExpect(jsonPath("$.error").value("Connection failed"));
    }
}
