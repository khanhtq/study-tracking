CREATE TABLE IF NOT EXISTS study_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    storage_path VARCHAR(512),
    storage_provider VARCHAR(50) DEFAULT 'AZURE',
    content_type VARCHAR(100),
    size_bytes BIGINT DEFAULT 0,
    is_folder BOOLEAN DEFAULT FALSE,
    parent_id BIGINT REFERENCES study_documents(id) ON DELETE CASCADE,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_study_documents_user_parent ON study_documents(user_id, parent_id, is_deleted);
CREATE INDEX idx_study_documents_user_deleted ON study_documents(user_id, is_deleted);
