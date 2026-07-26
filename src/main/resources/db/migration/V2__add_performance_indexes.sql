-- V2__add_performance_indexes.sql: Performance Indexes for Leaderboard, Study Sessions & Messaging

-- 1. Index for Leaderboard Total XP Queries (PostgreSQL Fallback & Warmup)
CREATE INDEX IF NOT EXISTS idx_users_total_xp ON users(total_xp DESC);

-- 2. Index for User Study Sessions History Queries
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_created ON study_sessions(user_id, created_at DESC);

-- 3. Indexes for Messaging & Unread Messages Count
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_read ON messages(recipient_id, is_read);

-- 4. Index for Friendships Lookup
CREATE INDEX IF NOT EXISTS idx_friendships_requester_status ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_status ON friendships(addressee_id, status);
