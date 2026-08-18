-- V20__remove_non_thpt_presets.sql
-- Remove default system preset exams other than THPT National High School Exam

-- First decouple countdown events referencing default presets to be removed
UPDATE countdown_events
SET preset_exam_code = NULL
WHERE preset_exam_code IN ('DGNL_HCMUT_2027', 'DGNL_VNU_HCM_2027', 'DGNL_HSA_VNU_HN_2027', 'TET_AM_2027');

-- Delete default preset exams that are not THPT QG and not community events created by users
DELETE FROM system_preset_exams
WHERE (is_community_event = FALSE OR is_community_event IS NULL)
  AND (created_by_user_id IS NULL)
  AND exam_code NOT LIKE 'THPT_QG%';
