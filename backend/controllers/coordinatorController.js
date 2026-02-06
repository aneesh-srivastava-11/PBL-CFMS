const { Course, User, CourseSection, Enrollment } = require('../models');

// @desc    Assign Instructor to a Section
// @route   POST /api/coordinator/courses/:courseId/sections
// @access  Private (Coordinator Only)
exports.assignInstructorToSection = async (req, res) => {
    const { courseId } = req.params;
    const { instructorId, section } = req.body;

    console.log(`[AssignInstructor] Request received: Course=${courseId}, Section='${section}', Instructor=${instructorId}`);

    try {
        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Verify Caller is the Coordinator
        if (course.coordinator_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized. Only the Course Coordinator can do this.' });
        }

        // Check if instructor exists
        const instructor = await User.findByPk(instructorId);
        if (!instructor || instructor.role !== 'faculty') {
            return res.status(400).json({ message: 'Invalid Instructor ID' });
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
        console.log(`[AssignInstructor] Section assignment saved for section '${section}'.`);

        // --- Auto-Enroll Students of this Section ---
        console.log(`[AutoEnroll] Starting process for section '${section}'...`);

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

        console.log(`[AutoEnroll] Found ${studentsInSection.length} matching students for section '${targetSection}'.`);

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
                    console.log(`[AutoEnroll] Enrolled student ${student.email}`);
                }
            } catch (err) {
                console.error(`[AutoEnroll] Failed to enroll ${student.email}:`, err.message);
            }
        }

        console.log(`[AutoEnroll] Process complete. Total new enrollments: ${enrolledCount}`);

        res.json({
            message: `Assigned ${instructor.name} to Section ${section}. Auto-enrolled ${enrolledCount} students (Found ${studentsInSection.length} in section).`,
            assignment,
            auto_enrolled_count: enrolledCount
        });

    } catch (error) {
        console.error('[AssignInstructor] Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Course Sections and Instructors
// @route   GET /api/coordinator/courses/:courseId/sections
// @access  Private (Coordinator/HOD/Instructor)
exports.getCourseSections = async (req, res) => {
    try {
        const sections = await CourseSection.findAll({
            where: { course_id: req.params.courseId },
            include: [
                { model: User, as: 'instructor', attributes: ['id', 'name', 'email'] }
            ]
        });
        res.json(sections);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
