package com.studytracker.config;

import com.studytracker.model.XpLevelConfig;
import com.studytracker.repository.XpLevelConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final XpLevelConfigRepository xpLevelConfigRepository;

    @Override
    public void run(String... args) throws Exception {
        if (xpLevelConfigRepository.count() == 0) {
            List<XpLevelConfig> configs = new ArrayList<>();
            // Config levels from 1 to 100
            for (int level = 1; level <= 100; level++) {
                // Formula: xp_required(level) = 100 * level^1.5 (rounded integer)
                int xpRequired = (int) Math.round(100 * Math.pow(level, 1.5));
                configs.add(XpLevelConfig.builder()
                        .level(level)
                        .xpRequired(xpRequired)
                        .build());
            }
            xpLevelConfigRepository.saveAll(configs);
            log.info("Initialized seed data for XpLevelConfig table (100 levels).");
        }
    }
}

