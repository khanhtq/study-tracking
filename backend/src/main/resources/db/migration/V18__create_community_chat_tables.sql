-- V18__create_community_chat_tables.sql
-- Create comprehensive tables for Community Realtime Chat System

-- 1. Chat Groups Table
CREATE TABLE chat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description VARCHAR(500),
    avatar_url TEXT,
    cover_url TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    privacy VARCHAR(20) NOT NULL DEFAULT 'PUBLIC', -- 'PUBLIC', 'PRIVATE'
    join_policy VARCHAR(30) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'APPROVAL_REQUIRED'
    max_members INT DEFAULT 5000,
    member_count INT NOT NULL DEFAULT 1,
    message_count BIGINT NOT NULL DEFAULT 0,
    popularity_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_groups_popularity ON chat_groups (privacy, popularity_score DESC, member_count DESC);
CREATE INDEX idx_chat_groups_owner ON chat_groups (owner_id);
CREATE INDEX idx_chat_groups_slug ON chat_groups (slug);

-- 2. Group Members Table
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER', -- 'OWNER', 'ADMIN', 'MODERATOR', 'MEMBER'
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'MUTED', 'BANNED'
    muted_until TIMESTAMP WITH TIME ZONE,
    last_read_message_id UUID,
    last_read_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_group_member UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_user ON group_members (user_id, group_id);
CREATE INDEX idx_group_members_group ON group_members (group_id, role);

-- 3. Group Join Requests Table
CREATE TABLE group_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
    request_message VARCHAR(255),
    via_invite_link BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_pending_group_request UNIQUE (group_id, user_id, status)
);

CREATE INDEX idx_group_join_requests_group ON group_join_requests (group_id, status);

-- 4. Group Messages Table
CREATE TABLE group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reply_to_id UUID REFERENCES group_messages(id) ON DELETE SET NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT', -- 'TEXT', 'MEDIA', 'FILE', 'STUDY_DOCUMENT', 'SYSTEM'
    content TEXT,
    has_mentions BOOLEAN NOT NULL DEFAULT FALSE,
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_group_messages_stream ON group_messages (group_id, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_group_messages_sender ON group_messages (sender_id);
CREATE INDEX idx_group_messages_fts ON group_messages USING gin(to_tsvector('simple', coalesce(content, ''))) WHERE is_deleted = FALSE;

-- 5. Message Mentions Table
CREATE TABLE message_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_message_mention UNIQUE (message_id, mentioned_user_id)
);

CREATE INDEX idx_message_mentions_user ON message_mentions (mentioned_user_id, is_read, created_at DESC);
CREATE INDEX idx_message_mentions_group ON message_mentions (group_id, mentioned_user_id);

-- 6. Message Attachments Table
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    study_document_id BIGINT REFERENCES study_documents(id) ON DELETE SET NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    attachment_type VARCHAR(20) NOT NULL, -- 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STUDY_DOCUMENT'
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_attachments_msg ON message_attachments (message_id);
CREATE INDEX idx_message_attachments_study_doc ON message_attachments (study_document_id);

-- 7. Message Reactions Table
CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_message_user_emoji UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_msg ON message_reactions (message_id);

-- 8. Group Pinned Messages Table
CREATE TABLE group_pinned_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    pinned_by UUID NOT NULL REFERENCES users(id),
    pinned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_group_pinned_msg UNIQUE (group_id, message_id)
);

CREATE INDEX idx_group_pinned_group ON group_pinned_messages (group_id, pinned_at DESC);

-- 9. Group Invite Links Table
CREATE TABLE group_invite_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    code VARCHAR(32) UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_uses INT DEFAULT NULL,
    used_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_group_invite_code ON group_invite_links (code) WHERE is_revoked = FALSE;
CREATE INDEX idx_group_invite_group ON group_invite_links (group_id, created_at DESC);
