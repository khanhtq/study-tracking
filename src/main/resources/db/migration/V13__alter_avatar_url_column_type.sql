-- V13__alter_avatar_url_column_type.sql
-- Expand avatar_url column in users table to TEXT to accommodate long Azure Storage SAS URLs

ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;
