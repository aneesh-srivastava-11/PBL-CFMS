const { Course, User } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

// @desc    Create a new course
// @route   POST /api/hod/courses
// @access  Private (HOD Only)
exports.createCourse = asyncHandler(async (req, res) => {
    const { course_code, course_name, semester } = req.body;

    // HOD creates the course. 
    // Note: faculty_id in Course might be legacy, but we can set it to HOD's ID or the default coordinator if provided.
    // For now, let's set faculty_id to the HOD's ID (req.user.id) as the "Creator".

    const course = await Course.create({
        course_code,
        course_name,
        semester,
        faculty_id: req.user.id // Creator
    });

    logger.info(`[HOD] Course created: ${course_code} - ${course_name}`);
    res.status(201).json(course);
});

// @desc    Assign a Coordinator to a Course
// @route   PUT /api/hod/courses/:courseId/coordinator
// @access  Private (HOD Only)
exports.assignCoordinator = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { facultyId } = req.body;

    const course = await Course.findByPk(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const faculty = await User.findByPk(facultyId);
    if (!faculty || faculty.role !== 'faculty') {
        res.status(400);
        throw new Error('Invalid Faculty ID');
    }

    course.coordinator_id = facultyId;
    await course.save();

    // Also update the faculty's status
    faculty.is_coordinator = true;
    await faculty.save();

    logger.info(`[HOD] Assigned ${faculty.name} as coordinator for ${course.course_code}`);
    res.json({ message: `Assigned ${faculty.name} as coordinator for ${course.course_code}` });
});

// @desc    Get All Faculties (Use to select coordinator)
// @route   GET /api/hod/faculties
// @access  Private (HOD Only)
exports.getAllFaculties = asyncHandler(async (req, res) => {
    const faculties = await User.findAll({
        where: { role: 'faculty' },
        attributes: ['id', 'name', 'email', 'phone_number']
    });
    res.json(faculties);
});

exports.bulkAddFaculties = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {
            res.status(400);
            throw new Error('Invalid Excel file format');
        }

        const rows = [];
        const emails = new Set();
        const errors = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const name = row.getCell(1).text ? row.getCell(1).text.trim() : '';
            const email = row.getCell(2).text ? row.getCell(2).text.trim() : '';
            const phone = row.getCell(3).text ? row.getCell(3).text.trim() : '';

            if (!name || !email || !phone) {
                errors.push(`Row ${rowNumber}: Missing fields from ${rowNumber} name:${name}`);
                return;
            }
            if (emails.has(email)) {
                errors.push(`Row ${rowNumber}: Duplicate email`);
                return;
            }
            emails.add(email);
            rows.push({ name, email, phone_number: phone, role: 'faculty', password: 'password123' });
        });

        if (errors.length) {
            res.status(400).json({ message: 'Validation Failed', errors });
            return;
        }
        if (!rows.length) {
            res.status(400);
            throw new Error('File Empty');
        }

        const existing = await User.findAll({ where: { email: Array.from(emails) } });
        if (existing.length) {
            res.status(400).json({ message: 'Duplicates in DB', errors: existing.map(u => u.email) });
            return;
        }

        await User.bulkCreate(rows);
        logger.info(`[HOD] Bulk added ${rows.length} faculties`);
        res.status(201).json({ message: `Added ${rows.length} faculties` });

    } finally {
        // cleanup
        try { await unlinkFile(req.file.path); } catch (e) { logger.warn(`[BulkAdd] Failed to delete temp file: ${e.message}`); }
    }
});

exports.bulkAddStudents = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {
            res.status(400);
            throw new Error('Invalid Excel file format');
        }

        const rows = [];
        const emails = new Set();
        const errors = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const name = row.getCell(1).text ? row.getCell(1).text.trim() : '';
            const email = row.getCell(2).text ? row.getCell(2).text.trim() : '';
            const sem = row.getCell(3).text ? row.getCell(3).text.trim() : '';
            const sec = row.getCell(4).text ? row.getCell(4).text.trim() : '';

            if (!name || !email || !sem || !sec) {
                errors.push(`Row ${rowNumber}: Missing fields`);
                return;
            }
            if (emails.has(email)) {
                errors.push(`Row ${rowNumber}: Duplicate email`);
                return;
            }
            emails.add(email);
            rows.push({ name, email, role: 'student', academic_semester: sem, section: sec, password: 'password123' });
        });

        if (errors.length) {
            res.status(400).json({ message: 'Validation Failed', errors });
            return;
        }
        if (!rows.length) {
            res.status(400);
            throw new Error('File Empty');
        }

        const existing = await User.findAll({ where: { email: Array.from(emails) } });
        if (existing.length) {
            res.status(400).json({ message: 'Duplicates in DB', errors: existing.map(u => u.email) });
            return;
        }

        await User.bulkCreate(rows);
        logger.info(`[HOD] Bulk added ${rows.length} students`);
        res.status(201).json({ message: `Added ${rows.length} students` });

    } finally {
        try { await unlinkFile(req.file.path); } catch (e) { logger.warn(`[BulkAdd] Failed to delete temp file: ${e.message}`); }
    }
});

// @desc    Get All Students (HOD Global List)
// @route   GET /api/hod/students
// @access  Private (HOD Only)
exports.getAllStudents = asyncHandler(async (req, res) => {
    const students = await User.findAll({
        where: { role: 'student' },
        attributes: ['id', 'name', 'email', 'section', 'academic_semester', 'phone_number']
    });
    res.json(students);
});

// @desc    Update any User (HOD Global Edit)
// @route   PUT /api/hod/users/:id
// @access  Private (HOD Only)
exports.updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, section, academic_semester, phone_number } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (name) user.name = name;
    if (section !== undefined) user.section = section; // Allow clearing
    if (academic_semester !== undefined) user.academic_semester = academic_semester;
    if (phone_number) user.phone_number = phone_number;

    await user.save();
    logger.info(`[HOD] User updated: ${user.email}`);
    res.json({ message: 'User updated successfully', user });
});
