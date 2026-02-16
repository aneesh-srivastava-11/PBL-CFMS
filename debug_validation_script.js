const Sequelize = require('sequelize');
const { getRequiredFilesList, validateCourseFiles } = require('./backend/utils/courseFileValidation');
const sequelize = require('./backend/config/db');
const Course = require('./backend/models/courseModel');
const Enrollment = require('./backend/models/enrollmentModel');
const File = require('./backend/models/fileModel'); // In case needed

async function testValidation() {
    try {
        console.log('Connecting to DB...');
        // Assume env vars are loaded or default to local config
        // Note: You might need to adjust paths if running from root

        const courseId = 3; // DAA Lab

        // 1. Fetch Course
        const course = await Course.findByPk(courseId);
        if (!course) {
            console.log('Course not found');
            return;
        }
        console.log(`Course Found: ${course.course_name} (${course.course_type})`);

        // 2. Fetch Enrollments
        const studentCount = await Enrollment.count({ where: { course_id: courseId } });
        console.log(`Student Count: ${studentCount}`);

        // 3. Simulate "No Files Uploaded" (Worst case)
        const uploadedFiles = [];

        // 4. Run Standard Validation
        const validation = validateCourseFiles(uploadedFiles, course.course_type);
        console.log('--- Initial Missing ---');
        validation.missing.forEach(m => console.log(`"${m}"`));

        // 5. Run Smart Validation Logic
        if (studentCount > 0) {
            console.log('\n--- Running Smart Logic ---');
            const relevantFiles = validation.missing.filter(f => f.toLowerCase().includes('name list of students'));
            console.log(`Found relevant files in missing: ${JSON.stringify(relevantFiles)}`);

            if (relevantFiles.length > 0) {
                validation.missing = validation.missing.filter(f => !f.toLowerCase().includes('name list of students'));
                relevantFiles.forEach(f => validation.uploaded.push(f));
                console.log('Moved to uploaded.');
            }
        }

        console.log('\n--- Final Missing ---');
        validation.missing.forEach(m => console.log(`"${m}"`));

        const isPresent = !validation.missing.some(m => m.toLowerCase().includes('name list of students'));
        console.log(`\nIS STUDENT LIST PRESENT? ${isPresent}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

testValidation();
