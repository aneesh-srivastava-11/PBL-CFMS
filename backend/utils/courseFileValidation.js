const REQUIRED_FILES_THEORY = [
    'Vision and Mission',
    'Faculty Profile',
    'Timetable of Teaching Faculty',
    'Course Handout',
    'Name List of Students',
    'Mid Term Exam Question Paper',
    'MTE Question Paper with Solution / Marking Scheme',
    'MTE Marks',
    'SOP for Identification of Slow and Advanced Learners',
    'List of Slow and Advanced Learners',
    'Record of Remedial Classes for Slow Learners',
    'Activities / Assignments for Advanced Learners',
    'Assignments and Quiz Question Papers with Solutions',
    'Record of MOOC',
    'Re-sessional Question Paper with Solution',
    'Re-sessional Marks',
    'CWS / Internal Assessment Marks',
    'Attendance Report',
    'End Semester Question Paper',
    'End Semester Question Paper with Solution / Scheme',
    'End Semester Marks / EA Report',
    'Result Analysis',
    'Student Feedback on Course Curriculum',
    'Student Feedback on Teaching-Learning Activities',
    'Course Exit Survey',
    'Minutes of Course Coordination Meetings',
    'Course Attainment Summary Report',
    'Course Closure Report',
    'Sample Assignments',
    'Sample MTE Answer Sheets'
];

const REQUIRED_FILES_LAB = [
    'Vision and Mission',
    'Faculty Profile',
    'Timetable of Teaching Faculty',
    'Course Handout',
    'Name List of Students',
    'List of Experiments',
    'Lab Mini Projects / Quiz / Additional Exercises / MOOCs',
    'PRS / Internal Assessment Marks',
    'Internal Assessment Marks / IA Report',
    'Attendance Report and Detainees',
    'End Semester Lab Question Paper',
    'Copy of End Semester Examination Attendance Sheet',
    'End Semester Assessment Marks / EA Report',
    'Result Analysis',
    'Student Feedback on Teaching-Learning Activities',
    'Student Feedback on Course Curriculum',
    'Course Exit Survey',
    'Course Attainment Summary Report',
    'Minutes of Course Coordination Meetings',
    'Course Closure Report'
];

/**
 * Get list of required files based on course type
 * @param {string} courseType - 'theory' or 'lab'
 * @returns {Array<string>} Array of required file names
 */
function getRequiredFilesList(courseType) {
    if (courseType === 'lab') {
        return REQUIRED_FILES_LAB;
    }
    return REQUIRED_FILES_THEORY;
}

/**
 * Validate if all required files are uploaded for a course
 * @param {Array<object>} uploadedFiles - Array of file objects from database
 * @param {string} courseType - 'theory' or 'lab'
 * @returns {object} - { valid: boolean, missing: Array<string>, uploaded: Array<string> }
 */
function validateCourseFiles(uploadedFiles, courseType) {
    const requiredFiles = getRequiredFilesList(courseType);
    const uploadedFileNames = uploadedFiles.map(f => f.filename);

    // Find missing files (case-insensitive partial match)
    const missing = requiredFiles.filter(required => {
        return !uploadedFileNames.some(uploaded => {
            // Normalize for comparison
            const reqNormalized = required.toLowerCase().trim();
            const uploadedNormalized = (uploaded || '').toLowerCase().trim();

            // Check if uploaded file name contains the required file name
            return uploadedNormalized.includes(reqNormalized) ||
                reqNormalized.includes(uploadedNormalized);
        });
    });

    const uploaded = requiredFiles.filter(required => {
        return uploadedFileNames.some(uploaded => {
            const reqNormalized = required.toLowerCase().trim();
            const uploadedNormalized = (uploaded || '').toLowerCase().trim();
            return uploadedNormalized.includes(reqNormalized) ||
                reqNormalized.includes(uploadedNormalized);
        });
    });

    return {
        valid: missing.length === 0,
        missing,
        uploaded,
        totalRequired: requiredFiles.length,
        totalUploaded: uploaded.length
    };
}

module.exports = {
    REQUIRED_FILES_THEORY,
    REQUIRED_FILES_LAB,
    getRequiredFilesList,
    validateCourseFiles
};
