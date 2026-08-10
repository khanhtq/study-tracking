-- V15__create_countdown_and_preset_tables.sql

CREATE TABLE IF NOT EXISTS system_preset_exams (
    id BIGSERIAL PRIMARY KEY,
    exam_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'exam',
    target_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_official_date BOOLEAN NOT NULL DEFAULT FALSE,
    source_url VARCHAR(500),
    description TEXT,
    color VARCHAR(50) DEFAULT 'indigo',
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS countdown_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preset_exam_code VARCHAR(50) REFERENCES system_preset_exams(exam_code) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    target_date TIMESTAMP WITH TIME ZONE NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'custom',
    color VARCHAR(50) DEFAULT 'indigo',
    icon VARCHAR(50) DEFAULT 'calendar',
    note TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    email_notify BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_countdown_user_id ON countdown_events(user_id);
CREATE INDEX idx_countdown_preset_code ON countdown_events(preset_exam_code);

-- Seed initial preset exam schedules (Estimated dates for 2027 academic year)
INSERT INTO system_preset_exams (exam_code, title, category, target_date, is_official_date, source_url, description, color)
VALUES
('THPT_QG_2027', 'Kỳ thi Tốt nghiệp THPT Quốc Gia 2027', 'exam', '2027-06-25 07:30:00+07', FALSE, 'https://moet.gov.vn', 'Kỳ thi tốt nghiệp THPT Quốc Gia chính thức hàng năm', 'indigo'),
('DGNL_HCMUT_2027', 'Kỳ thi ĐGNL Bách Khoa HCMUT 2027', 'exam', '2027-04-04 07:30:00+07', FALSE, 'https://hcmut.edu.vn', 'Kỳ thi Đánh giá năng lực Trường Đại học Bách Khoa TP.HCM', 'cyan'),
('DGNL_VNU_HCM_2027', 'Kỳ thi ĐGNL ĐHQG TP.HCM Đợt 1 2027', 'exam', '2027-03-28 07:30:00+07', FALSE, 'https://thinangluc.vnuhcm.edu.vn', 'Kỳ thi Đánh giá năng lực Đại học Quốc gia TP.HCM', 'emerald'),
('DGNL_HSA_VNU_HN_2027', 'Kỳ thi HSA ĐHQG Hà Nội 2027', 'exam', '2027-03-20 07:30:00+07', FALSE, 'https://hsa.edu.vn', 'Kỳ thi Đánh giá năng lực học sinh THPT của ĐHQG Hà Nội', 'amber'),
('TET_AM_2027', 'Tết Nguyên Đán Đinh Mùi 2027', 'event', '2027-02-06 00:00:00+07', TRUE, '', 'Tết Cổ Truyền Việt Nam (Mùng 1 Tết)', 'rose')
ON CONFLICT (exam_code) DO NOTHING;
