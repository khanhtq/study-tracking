-- V21__assign_thpt_to_admin.sql
-- Assign THPT National High School exam preset to Admin user

UPDATE system_preset_exams
SET created_by_user_id = (
    SELECT id FROM users WHERE role = 'ROLE_ADMIN' ORDER BY created_at ASC LIMIT 1
)
WHERE exam_code LIKE 'THPT_QG%' AND created_by_user_id IS NULL;
