-- V16__add_community_events_and_tracker_counts.sql

ALTER TABLE system_preset_exams
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_community_event BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tracker_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_preset_community ON system_preset_exams(is_community_event);
CREATE INDEX IF NOT EXISTS idx_preset_created_by ON system_preset_exams(created_by_user_id);

-- Initialize tracker counts for initial system preset exams based on existing countdown_events
UPDATE system_preset_exams spe
SET tracker_count = COALESCE((
    SELECT COUNT(*) 
    FROM countdown_events ce 
    WHERE ce.preset_exam_code = spe.exam_code
), 0);
