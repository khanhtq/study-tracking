-- V10__add_performance_indexes.sql: Additional Composite Indexes for Sessions, Users, and Friendships

-- 1. Index for active session lookup and batch session queries
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_ended ON study_sessions(user_id, ended_at);

-- 2. Index for session heartbeat scheduler cutoff cleanup
CREATE INDEX IF NOT EXISTS idx_study_sessions_heartbeat_ended ON study_sessions(ended_at, last_heartbeat_at);

-- 3. Index for admin period sessions & suspicious activity filtering
CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON study_sessions(started_at);

-- 4. Index for online users threshold lookup
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);

-- 5. Composite index for friendship pair lookup
CREATE INDEX IF NOT EXISTS idx_friendships_lookup_composite ON friendships(requester_id, addressee_id, status);
