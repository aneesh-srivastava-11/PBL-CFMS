const REQUIRED_FILES_THEORY = [
    'Vision and Mission (University and Department)',
    'Faculty Profile (all faculty members if more than one faculty is teaching a subject)',
    'Timetable of teaching faculty (all faculty if more than one faculty is teaching a subject) – individual timetable',
    'Course handout (including course closure report of previous A.Y. – if available)',
    'Name list of students (section wise)',
    'Mid Term Exam. (MTE) question paper (with CO Mapping)',
    'Mid Term Exam. (MTE) question paper with solution/ scheme',
    'MTE marks containing class average (section wise)',
    'SoP for identification of Slow and Advance learners',
    'Slow learners and Advance learners (section wise)',
    'Record of remedial classes for slow learners (as per format)',
    'Record of activities/ assignments given to advance learners',
    'Assignment (s) and quiz question paper (s) with solution',
    'Record of MOOC (NPTEL/ Coursera) completed - if any (List of students along with certificates)',
    'Re-sessional question paper (if applicable) and solution',
    'Re-sessional marks (section wise) with average',
    'CWS/ Internal assessment marks (with internal bifurcation section wise)',
    'Attendance report and detainees (section wise)',
    'End semester question paper (Final and moderated copy)',
    'End semester question paper with solution/ scheme',
    'End semester marks/ EA Report (section wise)',
    'Result analysis (section wise) (Pass %, Average GPA, % of different grades)',
    'Feedback by students on course curriculum',
    'Feedback by students on teaching-learning activities',
    'Course exit survey (by students for indirect attainment)',
    'Minutes of course coordination meetings',
    'Course attainment summary report (last page of OBE sheet)',
    'Course closure report/ remarks and improvement scope for next session',
    'Sample Assignments (Poor - 2, Average - 2, Best - 2)',
    'Sample MTE Answer Sheets (Poor - 2, Average - 2, Best - 2)'
];

const REQUIRED_FILES_LAB = [
    'Vision-Mission (University and Department)',
    'Faculty Profile (All Faculty if more than one faculty is teaching a subject)',
    'Timetable of Teaching Faculty (individual timetable)',
    'Course Handout (including course closure report of previous A.Y. – if available)',
    'Name list of students (section wise)',
    'List of experiments',
    'Lab mini projects, Quiz, Additional Exercises, MOOCs (if any)',
    'PRS / Internal assessment marks (with internal bifurcation section wise)',
    'Internal assessment marks/ IA Report (along with bifurcation) (section-wise)',
    'Attendance report and detainees (if any) (section wise)',
    'End semester lab question paper',
    'Copy of End Semester examination attendance sheet',
    'End semester assessment marks/ EA Report (section wise)',
    'Result Analysis (section wise)',
    'Feedback by students on teaching-learning activities',
    'Feedback by students on course curriculum',
    'Course exit survey (for indirect attainment)',
    'Course attainment summary report (last page of OBE sheet)',
    'Minutes of course coordination meetings',
    'Course closure report/ remarks and improvement scope for next session'
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
