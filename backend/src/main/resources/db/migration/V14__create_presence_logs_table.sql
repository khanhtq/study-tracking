-- V14__create_presence_logs_table.sql: Presence detection logs for study sessions

CREATE TABLE IF NOT EXISTS presence_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    present BOOLEAN NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_presence_user_session ON presence_logs(user_id, session_id);
CREATE INDEX idx_presence_timestamp ON presence_logs(timestamp);
