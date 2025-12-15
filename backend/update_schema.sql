USE course_file_db;

-- 1. Modify file_type ENUM to include new categories
ALTER TABLE course_files MODIFY COLUMN file_type ENUM(
    'handout', 
    'attendance', 
    'assignment', 
    'exam_paper', 
    'solution', -- Keeping legacy if any, though likely unused 
    'remedial', 
    'case_study', 
    'quiz', 
    'quiz_solution', 
    'exam_solution', 
    'assignment_solution', 
    'other'
) NOT NULL;

-- 2. Add is_visible column, default to true (visible)
ALTER TABLE course_files ADD COLUMN is_visible BOOLEAN DEFAULT TRUE;
