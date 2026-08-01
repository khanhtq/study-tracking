package com.studytracker.config;

import com.studytracker.model.Role;
import com.studytracker.model.User;
import com.studytracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
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
