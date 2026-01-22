const Enrollment = require('../models/enrollmentModel');
const Course = require('../models/courseModel');
const User = require('../models/userModel');
const ExcelJS = require('exceljs');

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
        console.log(`[DEBUG] getEnrolledStudents hit for courseId: ${courseId}`);
        const course = await Course.findByPk(courseId, {
            include: [{
                model: User,
                as: 'students',
                attributes: ['id', 'name', 'email', 'section', 'academic_semester']
            }]
        });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check ownership
        if (course.faculty_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        console.log(`[DEBUG] Found ${course.students.length} students for course ${courseId}`);
        res.json(course.students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.bulkEnrollStudents = async (req, res) => {
    const { courseId } = req.params;

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.faculty_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];

        const results = {
            success: [],
            failed: []
        };

        // Iterate rows (skip header row 1)
        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const emailCell = row.getCell(1).text; // Assume Email is Col 1
            const email = emailCell ? emailCell.trim() : null;

            // Optional: Section (Col 2), Semester (Col 3)
            const section = row.getCell(2).text ? row.getCell(2).text.trim() : null;
            const semester = row.getCell(3).text ? row.getCell(3).text.trim() : null;

            if (!email) continue;

            // Find Student
            let student = await User.findOne({ where: { email } });

            if (!student) {
                // Determine missing user logic. 
                // For now, fail. Or create placeholder? Coordinator can't create users usually.
                // We will stick to fail logic, but we should update existing users if found.
                results.failed.push({ email, reason: 'User not found' });
                continue;
            }
            if (student.role !== 'student') {
                results.failed.push({ email, reason: 'User is not a student' });
                continue;
            }

            // Update Section/Semester if provided
            if (section || semester) {
                if (section) student.section = section;
                if (semester) student.academic_semester = semester;
                await student.save();
            }

            // Check existing
            const existing = await Enrollment.findOne({
                where: { student_id: student.id, course_id: course.id }
            });

            if (existing) {
                results.failed.push({ email, reason: 'Already enrolled' });
                continue;
            }

            await Enrollment.create({
                student_id: student.id,
                course_id: course.id
            });
            results.success.push(email);
        }

        res.json({ message: 'Bulk processing complete', results });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error processing file' });
    }
};
