-- V3__seed_xp_level_config.sql: Seed Initial XP Level Configurations (Levels 1 to 100)

INSERT INTO xp_level_config (level, xp_required)
SELECT 
    lvl AS level,
    ROUND(100 * POWER(lvl, 1.5))::INT AS xp_required
FROM generate_series(1, 100) AS lvl
ON CONFLICT (level) DO NOTHING;
