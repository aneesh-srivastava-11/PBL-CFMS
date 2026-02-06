const { Course, User, CourseSection, Enrollment } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');

// @desc    Assign Instructor to a Section
// @route   POST /api/coordinator/courses/:courseId/sections
// @access  Private (Coordinator Only)
exports.assignInstructorToSection = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { instructorId, section } = req.body;

    logger.info(`[AssignInstructor] Request received: Course=${courseId}, Section='${section}', Instructor=${instructorId}`);

    const course = await Course.findByPk(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // Verify Caller is the Coordinator
    if (course.coordinator_id !== req.user.id && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized. Only the Course Coordinator can do this.');
    }

    // Check if instructor exists
    const instructor = await User.findByPk(instructorId);
    if (!instructor || instructor.role !== 'faculty') {
        res.status(400);
        throw new Error('Invalid Instructor ID');
    }

    // Create or Update Section Assignment
    let assignment = await CourseSection.findOne({
        where: { course_id: courseId, section: section }
    });

    if (assignment) {
        assignment.instructor_id = instructorId;
        await assignment.save();
    } else {
        assignment = await CourseSection.create({
            course_id: courseId,
            instructor_id: instructorId,
            section: section
        });
    }
    logger.info(`[AssignInstructor] Section assignment saved for section '${section}'.`);

    // --- Auto-Enroll Students of this Section ---
    logger.info(`[AutoEnroll] Starting process for section '${section}'...`);

    const targetSection = section.trim().toLowerCase();

    // 1. Find all students
    const allStudents = await User.findAll({
        where: { role: 'student' },
        attributes: ['id', 'name', 'email', 'section']
    });

    // 2. Filter in memory for case-insensitive match
    const studentsInSection = allStudents.filter(s =>
        s.section && s.section.trim().toLowerCase() === targetSection
    );

    logger.info(`[AutoEnroll] Found ${studentsInSection.length} matching students for section '${targetSection}'.`);

    // 3. Enroll them
    let enrolledCount = 0;
    for (const student of studentsInSection) {
        try {
            const [enrollment, created] = await Enrollment.findOrCreate({
                where: {
                    student_id: student.id,
                    course_id: courseId
                },
                defaults: {
                    student_id: student.id,
                    course_id: courseId,
                    section: section.trim()
                }
            });
            if (created) {
                enrolledCount++;
                logger.debug(`[AutoEnroll] Enrolled student ${student.email}`);
            }
        } catch (err) {
            logger.error(`[AutoEnroll] Failed to enroll ${student.email}: ${err.message}`);
        }
    }

    logger.info(`[AutoEnroll] Process complete. Total new enrollments: ${enrolledCount}`);

    res.json({
        message: `Assigned ${instructor.name} to Section ${section}. Auto-enrolled ${enrolledCount} students (Found ${studentsInSection.length} in section).`,
        assignment,
        auto_enrolled_count: enrolledCount
    });
});

// @desc    Get Course Sections and Instructors
// @route   GET /api/coordinator/courses/:courseId/sections
// @access  Private (Coordinator/HOD/Instructor)
exports.getCourseSections = asyncHandler(async (req, res) => {
    const sections = await CourseSection.findAll({
        where: { course_id: req.params.courseId },
        include: [
            { model: User, as: 'instructor', attributes: ['id', 'name', 'email'] }
        ]
    });
    res.json(sections);
});
