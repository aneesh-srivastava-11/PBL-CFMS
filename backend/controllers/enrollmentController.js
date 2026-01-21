const Enrollment = require('../models/enrollmentModel');
const Course = require('../models/courseModel');
const User = require('../models/userModel');

exports.enrollStudent = async (req, res) => {
    const { courseId } = req.params;
    const { studentEmail } = req.body;

    // Validation
    if (!studentEmail) {
        return res.status(400).json({ message: 'Student email is required' });
    }

    try {
        // 1. Verify Course ownership (Faculty only)
        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (course.faculty_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to enroll students in this course' });
        }

        // 2. Find Student by Email
        const student = await User.findOne({ where: { email: studentEmail } });
        if (!student) {
            return res.status(404).json({ message: 'Student not found. Ask them to login once first.' });
        }
        if (student.role !== 'student') {
            return res.status(400).json({ message: 'User is not a student' });
        }

        // 3. Create Enrollment
        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({
            where: {
                student_id: student.id,
                course_id: course.id
            }
        });

        if (existingEnrollment) {
            return res.status(400).json({ message: 'Student already enrolled' });
        }

        await Enrollment.create({
            student_id: student.id,
            course_id: course.id
        });

        res.status(201).json({ message: 'Student enrolled successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getEnrolledStudents = async (req, res) => {
    const { courseId } = req.params;
    try {
        const course = await Course.findByPk(courseId, {
            include: [{
                model: User,
                as: 'students',
                attributes: ['id', 'name', 'email']
            }]
        });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check ownership
        if (course.faculty_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(course.students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
