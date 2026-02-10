const { CourseSection, Enrollment, Course } = require('../models');
const logger = require('./logger');

/**
 * Auto-enroll a student in all courses that have an instructor assigned to their section
 * @param {number} studentId - The student's ID
 * @param {string} section - The student's section (e.g., "A", "B")
 * @returns {Promise<{enrolled: number, courses: Array}>}
 */
async function autoEnrollStudentBySection(studentId, section) {
    if (!section || typeof section !== 'string' || !section.trim()) {
        logger.debug(`[AutoEnroll] Invalid section for student ${studentId}: '${section}'`);
        return { enrolled: 0, courses: [] };
    }

    const targetSection = section.trim();

    logger.info(`[AutoEnroll] Auto-enrolling student ${studentId} (section: '${targetSection}')...`);

    try {
        // 1. Find all course sections that match this student's section
        const courseSections = await CourseSection.findAll({
            where: { section: targetSection },
            include: [
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'course_code', 'course_name']
                }
            ]
        });

        logger.debug(`[AutoEnroll] Found ${courseSections.length} course sections matching '${targetSection}'`);

        if (courseSections.length === 0) {
            logger.info(`[AutoEnroll] No courses found for section '${targetSection}'`);
            return { enrolled: 0, courses: [] };
        }

        // 2. Enroll student in each course
        let enrolledCount = 0;
        const enrolledCourses = [];

        for (const cs of courseSections) {
            try {
                const [enrollment, created] = await Enrollment.findOrCreate({
                    where: {
                        student_id: studentId,
                        course_id: cs.course_id
                    },
                    defaults: {
                        student_id: studentId,
                        course_id: cs.course_id,
                        section: targetSection
                    }
                });

                if (created) {
                    enrolledCount++;
                    enrolledCourses.push({
                        course_code: cs.course?.course_code,
                        course_name: cs.course?.course_name
                    });
                    logger.debug(`[AutoEnroll] ✓ Enrolled student ${studentId} in course ${cs.course?.course_code}`);
                } else {
                    logger.debug(`[AutoEnroll] ○ Student ${studentId} already enrolled in ${cs.course?.course_code}`);
                }
            } catch (err) {
                logger.error(`[AutoEnroll] ✗ Failed to enroll student ${studentId} in course ${cs.course_id}: ${err.message}`);
            }
        }

        logger.info(`[AutoEnroll] Completed. Student ${studentId} enrolled in ${enrolledCount} new courses.`);
        return { enrolled: enrolledCount, courses: enrolledCourses };

    } catch (error) {
        logger.error(`[AutoEnroll] Error during auto-enrollment for student ${studentId}: ${error.message}`);
        return { enrolled: 0, courses: [] };
    }
}

module.exports = { autoEnrollStudentBySection };
