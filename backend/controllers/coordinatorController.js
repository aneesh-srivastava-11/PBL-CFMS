const { Course, User, CourseSection } = require('../models');

// @desc    Assign Instructor to a Section
// @route   POST /api/coordinator/courses/:courseId/sections
// @access  Private (Coordinator Only)
exports.assignInstructorToSection = async (req, res) => {
    const { courseId } = req.params;
    const { instructorId, section } = req.body;

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
        // Check if this section already has an instructor? Or allow multiple?
        // Usually one instructor per section per course.

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

        res.json({ message: `Assigned ${instructor.name} to Section ${section}`, assignment });

    } catch (error) {
        console.error(error);
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
