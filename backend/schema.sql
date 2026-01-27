CREATE DATABASE IF NOT EXISTS course_file_db;
USE course_file_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NULL, -- Nullable for Firebase Auth
    role ENUM('admin', 'faculty', 'student', 'reviewer') DEFAULT 'student',
    is_coordinator BOOLEAN DEFAULT FALSE,
    firebase_uid VARCHAR(255) UNIQUE DEFAULT NULL,
    section VARCHAR(50) DEFAULT NULL,
    academic_semester VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    faculty_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Enrollments Table (Missing in previous dumps)
-- Captures many-to-many relationship between Students and Courses
CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (student_id, course_id)
);

-- 4. Course Files Table
CREATE TABLE IF NOT EXISTS course_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    file_type ENUM(
        'handout', 
        'attendance', 
        'assignment', 
        'exam_paper', 
        'remedial', 
        'case_study', 
        'quiz', 
        'quiz_solution', 
        'exam_solution', 
        'assignment_solution', 
        'marks', 
        'academic_feedback', 
        'action_taken',
        'other'
    ) NOT NULL DEFAULT 'other',
    filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(255) NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
