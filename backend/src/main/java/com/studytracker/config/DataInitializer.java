package com.studytracker.config;

import com.studytracker.model.Role;
import com.studytracker.model.User;
import com.studytracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        // Auto-patch columns if migration was skipped or table was created before V16
        try {
            jdbcTemplate.execute("ALTER TABLE system_preset_exams ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;");
            jdbcTemplate.execute("ALTER TABLE system_preset_exams ADD COLUMN IF NOT EXISTS is_community_event BOOLEAN NOT NULL DEFAULT FALSE;");
            jdbcTemplate.execute("ALTER TABLE system_preset_exams ADD COLUMN IF NOT EXISTS tracker_count INT NOT NULL DEFAULT 0;");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_preset_community ON system_preset_exams(is_community_event);");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_preset_created_by ON system_preset_exams(created_by_user_id);");
            // Clean up old default non-THPT presets
            jdbcTemplate.execute("UPDATE countdown_events SET preset_exam_code = NULL WHERE preset_exam_code IN ('DGNL_HCMUT_2027', 'DGNL_VNU_HCM_2027', 'DGNL_HSA_VNU_HN_2027', 'TET_AM_2027');");
            jdbcTemplate.execute("DELETE FROM system_preset_exams WHERE (is_community_event = FALSE OR is_community_event IS NULL) AND (created_by_user_id IS NULL) AND exam_code NOT LIKE 'THPT_QG%';");
            jdbcTemplate.execute("UPDATE system_preset_exams SET created_by_user_id = (SELECT id FROM users WHERE role = 'ROLE_ADMIN' ORDER BY created_at ASC LIMIT 1) WHERE exam_code LIKE 'THPT_QG%' AND created_by_user_id IS NULL;");
            log.info("Database auto-patch: Ensured all columns on system_preset_exams exist, non-THPT presets cleaned, and THPT assigned to admin.");
        } catch (Exception e) {
            log.warn("Database auto-patch on system_preset_exams: {}", e.getMessage());
        }

        String adminEmail = "admin@studyxp.com";
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = User.builder()
                    .email(adminEmail)
                    .passwordHash(passwordEncoder.encode("Admin123!"))
                    .displayName("System Admin")
                    .role(Role.ROLE_ADMIN)
                    .enabled(true)
                    .currentLevel(10)
                    .currentXp(500)
                    .totalXp(15000L)
                    .build();

            userRepository.save(admin);
            log.info("Default Admin account created: {}", adminEmail);
        }
    }
}
