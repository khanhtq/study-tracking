-- V4__add_user_ban_columns.sql: Add ban fields to users table for Admin ban feature

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
