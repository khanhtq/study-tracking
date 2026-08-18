-- V22: Tạo bảng liên kết sự kiện đếm ngược vào nhóm chat (Group Countdown Links)
CREATE TABLE IF NOT EXISTS group_countdown_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    preset_exam_id BIGINT REFERENCES system_preset_exams(id) ON DELETE CASCADE,
    custom_countdown_id UUID REFERENCES countdown_events(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_daily_notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_group_preset UNIQUE (group_id, preset_exam_id),
    CONSTRAINT uq_group_custom UNIQUE (group_id, custom_countdown_id),
    CONSTRAINT chk_countdown_link_target CHECK (preset_exam_id IS NOT NULL OR custom_countdown_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_group_countdown_links_group_id ON group_countdown_links(group_id);
CREATE INDEX IF NOT EXISTS idx_group_countdown_links_preset ON group_countdown_links(preset_exam_id);
CREATE INDEX IF NOT EXISTS idx_group_countdown_links_custom ON group_countdown_links(custom_countdown_id);
