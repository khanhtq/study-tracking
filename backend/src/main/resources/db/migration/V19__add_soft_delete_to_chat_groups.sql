ALTER TABLE chat_groups ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE chat_groups ADD COLUMN deleted_by UUID REFERENCES users(id);
CREATE INDEX idx_chat_groups_deleted ON chat_groups (deleted_at);
