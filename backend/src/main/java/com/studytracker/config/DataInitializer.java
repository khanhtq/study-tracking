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
            jdbcTemplate.execute("UPDATE system_preset_exams SET created_by_user_id = (SELECT id FROM users WHERE role = 'ROLE_ADMIN' ORDER BY created_at ASC LIMIT 1) WHERE exam_code LIKE 'THPT_QG%' AND created_by_user_id IS NULL;");
            
            // Auto-patch table group_countdown_links
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS group_countdown_links (" +
                    "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), " +
                    "group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE, " +
                    "preset_exam_id BIGINT REFERENCES system_preset_exams(id) ON DELETE CASCADE, " +
                    "custom_countdown_id UUID REFERENCES countdown_events(id) ON DELETE CASCADE, " +
                    "created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, " +
                    "last_daily_notified_at TIMESTAMP WITH TIME ZONE, " +
                    "created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), " +
                    "CONSTRAINT uq_group_preset UNIQUE (group_id, preset_exam_id), " +
                    "CONSTRAINT uq_group_custom UNIQUE (group_id, custom_countdown_id), " +
                    "CONSTRAINT chk_countdown_link_target CHECK (preset_exam_id IS NOT NULL OR custom_countdown_id IS NOT NULL)" +
                    ");");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_group_countdown_links_group_id ON group_countdown_links(group_id);");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_group_countdown_links_preset ON group_countdown_links(preset_exam_id);");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_group_countdown_links_custom ON group_countdown_links(custom_countdown_id);");
            
            log.info("Database auto-patch: Ensured all columns on system_preset_exams exist, non-THPT presets cleaned, THPT assigned to admin, and group_countdown_links table ensured.");
        } catch (Exception e) {
            log.warn("Database auto-patch: {}", e.getMessage());
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
