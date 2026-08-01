-- V1__init_schema.sql: Initial Database Schema for Study XP Tracker

-- 1. Table: users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url VARCHAR(255),
    bio VARCHAR(255),
    daily_goal_minutes INT DEFAULT 60,
    favorite_subjects VARCHAR(255),
    selected_title VARCHAR(255) DEFAULT 'Tân Binh Tập Trung',
    theme_accent VARCHAR(255) DEFAULT 'indigo',
    sound_enabled BOOLEAN DEFAULT TRUE,
    preferred_language VARCHAR(255) DEFAULT 'en',
    activity_status_visibility VARCHAR(255) DEFAULT 'EVERYONE',
    message_permission VARCHAR(255) DEFAULT 'EVERYONE',
    auth_provider VARCHAR(255) DEFAULT 'LOCAL',
    current_level INT NOT NULL DEFAULT 1,
    current_xp INT NOT NULL DEFAULT 0,
    total_xp BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    role VARCHAR(255) DEFAULT 'ROLE_USER',
    enabled BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(255),
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    last_otp_sent_at TIMESTAMP WITH TIME ZONE
);

-- 2. Table: xp_level_config
CREATE TABLE xp_level_config (
    level INT PRIMARY KEY,
    xp_required INT NOT NULL
);

-- 3. Table: study_sessions
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INT,
    xp_earned INT,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    source VARCHAR(255) NOT NULL,
    study_method VARCHAR(255),
    target_duration_seconds INT,
    is_completed BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
);

-- 4. Table: friendships
CREATE TABLE friendships (
    id UUID PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_friendships_requester_addressee UNIQUE (requester_id, addressee_id)
);

-- 5. Table: messages
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);
