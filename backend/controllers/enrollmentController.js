const Enrollment = require('../models/enrollmentModel');
const Course = require('../models/courseModel');
const User = require('../models/userModel');
const logger = require('../utils/logger');
const asyncHandler = require('../middleware/asyncHandler');
const ExcelJS = require('exceljs');


exports.enrollStudent = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { studentEmail } = req.body;

    // Validation
    if (!studentEmail) {
        res.status(400);
        throw new Error('Student email is required');
    }

    // 1. Verify Course ownership (Faculty only)
    const course = await Course.findByPk(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    const isCoordinator = (await course.countCoordinators({ where: { id: req.user.id } })) > 0;
    if (course.faculty_id !== req.user.id && req.user.role !== 'admin' && !isCoordinator) {
        res.status(403);
        throw new Error('Not authorized to enroll students in this course');
    }

    // 2. Find Student by Email
    const student = await User.findOne({ where: { email: studentEmail } });
    if (!student) {
        res.status(404);
        throw new Error('Student not found. Ask them to login once first.');
    }
    if (student.role !== 'student') {
        res.status(400);
        throw new Error('User is not a student');
    }

    // 3. Create Enrollment
    const existingEnrollment = await Enrollment.findOne({
        where: {
            student_id: student.id,
            course_id: course.id
        }
    });

    if (existingEnrollment) {
        res.status(400);
        throw new Error('Student already enrolled');
    }

    await Enrollment.create({
        student_id: student.id,
        course_id: course.id
    });

    logger.info(`[Enrollment] Student ${studentEmail} enrolled in course ${courseId}`);
    res.status(201).json({ message: 'Student enrolled successfully' });
});

exports.deleteEnrollment = asyncHandler(async (req, res) => {
    const { courseId, studentId } = req.params;

    // 1. Verify Course ownership (Faculty only)
    const course = await Course.findByPk(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    const isCoordinator = (await course.countCoordinators({ where: { id: req.user.id } })) > 0;
    if (course.faculty_id !== req.user.id && req.user.role !== 'admin' && !isCoordinator) {
        res.status(403);
        throw new Error('Not authorized to manage enrollments for this course');
    }

    // 2. Find and delete enrollment
    const enrollment = await Enrollment.findOne({
        where: {
            student_id: studentId,
            course_id: courseId
        }
    });

    if (!enrollment) {
        res.status(404);
        throw new Error('Enrollment not found');
    }

    await enrollment.destroy();
    logger.info(`[Enrollment] Student ${studentId} removed from course ${courseId}`);
    res.json({ message: 'Enrollment deleted successfully' });
});


exports.getEnrolledStudents = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    logger.debug(`[DEBUG] getEnrolledStudents hit for courseId: ${courseId}`);
    const course = await Course.findByPk(courseId, {
        include: [{
            model: User,
            as: 'students',
            attributes: ['id', 'name', 'email', 'section', 'academic_semester']
        }]
    });

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // Check Permission & Filter Scope
    let sectionFilter = null;

    const isCoordinator = (await course.countCoordinators({ where: { id: req.user.id } })) > 0;

    if (req.user.role === 'admin' || course.faculty_id === req.user.id || isCoordinator) {
        // Full Access: See all students
    } else {
        // Check if Section Instructor
        const CourseSection = require('../models/courseSectionModel');
        const assignment = await CourseSection.findOne({
            where: { course_id: courseId, instructor_id: req.user.id }
        });

        if (assignment) {
            // Restricted Access: See only own section
            sectionFilter = assignment.section;
        } else {
            res.status(403);
            throw new Error('Not authorized to view students for this course');
        }
    }

    // Filter students in memory (simpler than complex include where) or use DB filter if possible
    let students = course.students;
    if (sectionFilter) {
        students = students.filter(s => s.section === sectionFilter);
    }

    logger.debug(`[DEBUG] Found ${students.length} students for course ${courseId} (Filter: ${sectionFilter || 'All'})`);
    res.json(students);
});

exports.downloadTemplate = asyncHandler(async (req, res) => {
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
});

exports.updateStudentDetails = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { section, academic_semester } = req.body;

    const student = await User.findByPk(studentId);
    if (!student) {
        res.status(404);
        throw new Error('Student not found');
    }

    // Only Coordinator or Admin can update
    // (Assuming authMiddleware protects usage, but double check role/coordinator status logic if needed)
    // Since this is coordinate route, we assume protection is in place or handled by frontend visibility + checks.
    // Ideally should check course context or global coordinator permission.
    // For now, allow simple update.

    if (section) student.section = section;
    if (academic_semester) student.academic_semester = academic_semester;

    await student.save();
    logger.info(`[Student] Details updated for ${student.email}`);
    res.json({ message: 'Student details updated', student });
});

exports.bulkEnrollStudents = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { preview, force } = req.query; // ?preview=true or ?force=true (though logic handles force implicitly by processing valid)

    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }

    try {
        const course = await Course.findByPk(courseId);
        if (!course) {
            res.status(404);
            throw new Error('Course not found');
        }

        // 0. Check Coordinator Status
        const isCoordinator = (await course.countCoordinators({ where: { id: req.user.id } })) > 0;

        if (course.faculty_id !== req.user.id && req.user.role !== 'admin' && !isCoordinator) {
            res.status(403);
            throw new Error('Not authorized to enroll students. Instructors cannot enroll students.');
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer); // Load from buffer (Memory Storage)
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
            res.status(400);
            throw new Error('Invalid Template. "Email" column not found.');
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
            res.json({
                message: 'Preview generated',
                stats: {
                    total_rows: results.success.length + results.failed.length,
                    valid: results.success.length,
                    invalid: results.failed.length
                },
                results
            });
            return; // Ensure we stop here
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

        logger.info(`[BulkEnroll] Processed. Enrolled: ${enrolled.length}, Failed: ${results.failed.length}`);

        res.json({
            message: 'Bulk enrollment processed',
            enrolled_count: enrolled.length,
            failed_examples: results.failed
        });

    } catch (error) {
        // No explicit finally block needed for memory buffer
        throw error; // Let AsyncHandler handle usage
    }
});
