-- Migration Script for Firebase Auth Support

-- 1. Add firebase_uid column to users table
ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(255) UNIQUE DEFAULT NULL;

-- 2. Make password nullable (optional, if you plan to fully remove password login later)
-- ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL;

-- 3. Update file_type enum if strictly enforced in DB (based on previous task)
-- ALTER TABLE course_files MODIFY COLUMN file_type ENUM(
--    'handout', 'attendance', 'assignment', 'exam_paper', 'remedial', 'case_study', 
--    'quiz', 'quiz_solution', 'exam_solution', 'assignment_solution', 'other',
--    'marks', 'academic_feedback', 'action_taken'
-- );
