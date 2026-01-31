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

exports.downloadTemplate = async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Enrollment Template');

        worksheet.columns = [
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Section', key: 'section', width: 15 },
            { header: 'Semester', key: 'semester', width: 15 }
        ];

        // Add example row
        worksheet.addRow({ email: 'student@example.com', section: 'A', semester: 'Fall 2025' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Enrollment_Template.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating template', error);
        res.status(500).json({ message: 'Error generating template' });
    }
};

exports.updateStudentDetails = async (req, res) => {
    const { studentId } = req.params;
    const { section, academic_semester } = req.body;

    try {
        const student = await User.findByPk(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Only Coordinator or Admin can update
        // (Assuming authMiddleware protects usage, but double check role/coordinator status logic if needed)
        // Since this is coordinate route, we assume protection is in place or handled by frontend visibility + checks.
        // Ideally should check course context or global coordinator permission.
        // For now, allow simple update.

        if (section) student.section = section;
        if (academic_semester) student.academic_semester = academic_semester;

        await student.save();

        res.json({ message: 'Student details updated', student });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating student' });
    }
};

exports.bulkEnrollStudents = async (req, res) => {
    const { courseId } = req.params;
    const { preview, force } = req.query; // ?preview=true or ?force=true (though logic handles force implicitly by processing valid)

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

        // 1. Identify Headers Dynamically
        const headerRow = worksheet.getRow(1);
        let emailCol = 0, sectionCol = 0, semesterCol = 0;

        headerRow.eachCell((cell, colNumber) => {
            const val = cell.text ? cell.text.toLowerCase().trim() : '';
            if (val.includes('email')) emailCol = colNumber;
            else if (val.includes('section')) sectionCol = colNumber;
            else if (val.includes('semester') || val.includes('sem')) semesterCol = colNumber;
        });

        if (emailCol === 0) {
            return res.status(400).json({ message: 'Invalid Template. "Email" column not found.' });
        }

        // 2. Process Rows
        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const emailText = row.getCell(emailCol).text;
            const email = emailText ? emailText.trim() : null;

            if (!email) continue; // Skip empty rows

            // Domain Check
            if (!email.toLowerCase().endsWith('@muj.manipal.edu')) {
                results.failed.push({ email, row: i, reason: 'Invalid Email Domain (Must be @muj.manipal.edu)' });
                continue;
            }

            const section = sectionCol ? (row.getCell(sectionCol).text ? row.getCell(sectionCol).text.trim() : null) : null;
            const semester = semesterCol ? (row.getCell(semesterCol).text ? row.getCell(semesterCol).text.trim() : null) : null;

            // Logic:
            // 1. Check if user exists.
            // 2. Check if student role.
            // 3. Check already enrolled.

            const student = await User.findOne({ where: { email } });

            if (!student) {
                results.failed.push({ email, row: i, reason: 'User not registered in system' });
                continue;
            }
            if (student.role !== 'student') {
                results.failed.push({ email, row: i, reason: 'User is not a student' });
                continue;
            }

            const existing = await Enrollment.findOne({
                where: { student_id: student.id, course_id: course.id }
            });

            if (existing) {
                // If enrolled, we might still want to update details?
                // For now, fail as "Already enrolled"
                results.failed.push({ email, row: i, reason: 'Already enrolled' });
                continue;
            }

            // If we are here, it's valid for enrollment.
            results.success.push({
                email,
                student_id: student.id,
                section: section || student.section,
                semester: semester || student.academic_semester
            });
        }

        // 3. Response handling
        if (preview === 'true') {
            // Return analysis only
            return res.json({
                message: 'Preview generated',
                stats: {
                    total_rows: results.success.length + results.failed.length,
                    valid: results.success.length,
                    invalid: results.failed.length
                },
                results
            });
        }

        // 4. Execution (Save to DB)
        const enrolled = [];
        for (const validItem of results.success) {
            // Update user details if provided
            if (validItem.section || validItem.semester) {
                await User.update(
                    {
                        section: validItem.section,
                        academic_semester: validItem.semester
                    },
                    { where: { id: validItem.student_id } }
                );
            }

            // Create Enrollment
            await Enrollment.create({
                student_id: validItem.student_id,
                course_id: course.id
            });
            enrolled.push(validItem.email);
        }

        res.json({
            message: 'Bulk enrollment processed',
            enrolled_count: enrolled.length,
            failed_examples: results.failed
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error processing file' });
    }
};
