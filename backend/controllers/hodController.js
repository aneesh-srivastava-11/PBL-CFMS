const { Course, User } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);
const { autoEnrollStudentBySection } = require('../utils/autoEnrollment');
const { createFirebaseUser } = require('../services/firebaseService');

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

    logger.info(`[HOD] Assigning Coordinator: Course ${courseId}, Faculty ${facultyId}`);

    const course = await Course.findByPk(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const faculty = await User.findByPk(facultyId);
    if (!faculty || faculty.role !== 'faculty') {
        res.status(400);
        throw new Error('Invalid Faculty ID or not a faculty member');
    }

    try {
        // Use Sequelize 'add' method for Many-to-Many
        // Alias is 'coordinators' -> addCoordinator or addCoordinators
        // Trying singular first, then plural if fails? No, sequelizes uses singular for hasMany/BelongsToMany usually

        if (typeof course.addCoordinator !== 'function') {
            logger.error(`[HOD] addCoordinator method missing on Course model. Available methods: ${Object.keys(course.__proto__)}`);
            throw new Error('Internal Server Error: Association method missing');
        }

        await course.addCoordinator(faculty);

        // Also update the faculty's status (is_coordinator flag on User model)
        faculty.is_coordinator = true;
        await faculty.save();

        logger.info(`[HOD] Added ${faculty.name} as coordinator for ${course.course_code}`);
        res.json({ message: `Added ${faculty.name} as coordinator for ${course.course_code}` });
    } catch (error) {
        logger.error(`[HOD] Assignment Failed: ${error.message}`);
        res.status(500).json({ message: `Assignment failed: ${error.message}` });
    }
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
        const skipped = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const name = row.getCell(1).text ? row.getCell(1).text.trim() : '';
            const email = row.getCell(2).text ? row.getCell(2).text.trim() : '';
            const phone = row.getCell(3).text ? row.getCell(3).text.trim() : '';

            if (!name || !email || !phone) {
                skipped.push({ row: rowNumber, email, reason: 'Missing required fields' });
                return;
            }
            // Domain validation for faculty
            if (!email.toLowerCase().endsWith('@jaipur.manipal.edu')) {
                skipped.push({ row: rowNumber, email, reason: 'Invalid domain (must be @jaipur.manipal.edu)' });
                return;
            }
            if (emails.has(email)) {
                skipped.push({ row: rowNumber, email, reason: 'Duplicate email in file' });
                return;
            }
            emails.add(email);
            rows.push({ name, email, phone_number: phone, role: 'faculty', password: 'password123' });
        });

        if (!rows.length) {
            res.status(400).json({
                message: 'No valid faculties to add',
                skipped,
                total_rows: skipped.length,
                valid_rows: 0
            });
            return;
        }

        // Filter out emails that already exist in DB
        const existing = await User.findAll({ where: { email: Array.from(emails) } });
        const existingEmails = new Set(existing.map(u => u.email));

        const finalRows = rows.filter(row => {
            if (existingEmails.has(row.email)) {
                skipped.push({ email: row.email, reason: 'Already exists in database' });
                return false;
            }
            return true;
        });

        if (finalRows.length === 0) {
            res.status(400).json({
                message: 'No new faculties to add (all skipped)',
                skipped,
                added: 0
            });
            return;
        }

        // Create users in Firebase AND Database
        const createdUsers = [];
        for (const row of finalRows) {
            try {
                const uid = await createFirebaseUser(row.email, row.password, row.name);
                row.firebase_uid = uid; // Add UID to the row data
                const newUser = await User.create(row);
                createdUsers.push(newUser);
            } catch (err) {
                logger.error(`[BulkAdd] Failed to create user ${row.email}: ${err.message}`);
                skipped.push({ email: row.email, reason: `Firebase Error: ${err.message}` });
            }
        }

        logger.info(`[HOD] Bulk added ${createdUsers.length} faculties (skipped ${skipped.length})`);
        res.status(201).json({
            message: `Successfully added ${createdUsers.length} faculties`,
            added: createdUsers.length,
            skipped: skipped.length,
            skipped_details: skipped.length > 0 ? skipped : undefined
        });

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
        const skipped = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const name = row.getCell(1).text ? row.getCell(1).text.trim() : '';
            const email = row.getCell(2).text ? row.getCell(2).text.trim() : '';
            const sem = row.getCell(3).text ? row.getCell(3).text.trim() : '';
            const sec = row.getCell(4).text ? row.getCell(4).text.trim() : '';

            if (!name || !email || !sem || !sec) {
                skipped.push({ row: rowNumber, email, reason: 'Missing required fields' });
                return;
            }
            // Domain validation for students
            if (!email.toLowerCase().endsWith('@muj.manipal.edu')) {
                skipped.push({ row: rowNumber, email, reason: 'Invalid domain (must be @muj.manipal.edu)' });
                return;
            }
            if (emails.has(email)) {
                skipped.push({ row: rowNumber, email, reason: 'Duplicate email in file' });
                return;
            }
            emails.add(email);
            rows.push({ name, email, role: 'student', academic_semester: sem, section: sec, password: 'password123' });
        });

        if (!rows.length) {
            res.status(400).json({
                message: 'No valid students to add',
                skipped,
                total_rows: skipped.length,
                valid_rows: 0
            });
            return;
        }

        // Filter out emails that already exist in DB
        const existing = await User.findAll({ where: { email: Array.from(emails) } });
        const existingEmails = new Set(existing.map(u => u.email));

        const finalRows = rows.filter(row => {
            if (existingEmails.has(row.email)) {
                skipped.push({ email: row.email, reason: 'Already exists in database' });
                return false;
            }
            return true;
        });

        if (finalRows.length === 0) {
            res.status(400).json({
                message: 'No new students to add (all skipped)',
                skipped,
                added: 0
            });
            return;
        }

        // Create users in Firebase AND Database
        const createdUsers = [];
        for (const row of finalRows) {
            try {
                const uid = await createFirebaseUser(row.email, row.password, row.name);
                row.firebase_uid = uid;
                const newUser = await User.create(row);
                createdUsers.push(newUser);
            } catch (err) {
                logger.error(`[BulkAdd] Failed to create user ${row.email}: ${err.message}`);
                skipped.push({ email: row.email, reason: `Firebase Error: ${err.message}` });
            }
        }

        logger.info(`[HOD] Bulk added ${createdUsers.length} students (skipped ${skipped.length})`);

        // Auto-enroll all students in courses matching their sections
        let totalEnrolled = 0;
        for (const student of createdUsers) {
            if (student.section) {
                const result = await autoEnrollStudentBySection(student.id, student.section);
                totalEnrolled += result.enrolled;
            }
        }

        res.status(201).json({
            message: `Successfully added ${createdUsers.length} students`,
            added: createdUsers.length,
            skipped: skipped.length,
            auto_enrolled_total: totalEnrolled,
            skipped_details: skipped.length > 0 ? skipped : undefined
        });


    } finally {
        try { await unlinkFile(req.file.path); } catch (e) { logger.warn(`[BulkAdd] Failed to delete temp file: ${e.message}`); }
    }
});

// @desc    Create a Single User (HOD Manual Add)
// @route   POST /api/hod/users
// @access  Private (HOD Only)
exports.createUser = asyncHandler(async (req, res) => {
    const { name, email, role, phone_number, section, academic_semester } = req.body;

    if (!name || !email || !role) {
        res.status(400);
        throw new Error('Name, Email, and Role are required');
    }

    // Domain Validation
    if (role === 'student' && !email.toLowerCase().endsWith('@muj.manipal.edu')) {
        res.status(400);
        throw new Error('Student email must end with @muj.manipal.edu');
    }
    if (role === 'faculty' && !email.toLowerCase().endsWith('@jaipur.manipal.edu')) {
        res.status(400);
        throw new Error('Faculty email must end with @jaipur.manipal.edu');
    }

    // Check if user exists in DB
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Create in Firebase
    let firebaseUid;
    try {
        firebaseUid = await createFirebaseUser(email, 'password123', name);
    } catch (error) {
        res.status(500);
        throw new Error(`Failed to create Firebase user: ${error.message}`);
    }

    // Create in DB
    const user = await User.create({
        name,
        email,
        role,
        phone_number,
        section: role === 'student' ? section : null,
        academic_semester: role === 'student' ? academic_semester : null,
        password: 'password123',
        firebase_uid: firebaseUid
    });

    logger.info(`[HOD] Manually created user: ${email} (${role})`);

    // Auto-enroll if student
    let autoEnrollResult = null;
    if (role === 'student' && section) {
        autoEnrollResult = await autoEnrollStudentBySection(user.id, section);
    }

    res.status(201).json({
        message: 'User created successfully',
        user,
        auto_enrollment: autoEnrollResult ? {
            enrolled: autoEnrollResult.enrolled,
            courses: autoEnrollResult.courses
        } : null
    });
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

    const sectionChanged = section !== undefined && section !== user.section;
    const oldSection = user.section;

    if (name) user.name = name;
    if (section !== undefined) user.section = section; // Allow clearing
    if (academic_semester !== undefined) user.academic_semester = academic_semester;
    if (phone_number) user.phone_number = phone_number;

    await user.save();
    logger.info(`[HOD] User updated: ${user.email}`);

    // Auto-enroll if section was changed for a student
    let autoEnrollResult = null;
    if (sectionChanged && user.role === 'student' && user.section) {
        logger.info(`[HOD] Section changed for student ${user.email} from '${oldSection}' to '${user.section}'. Triggering auto-enrollment...`);
        autoEnrollResult = await autoEnrollStudentBySection(user.id, user.section);
    }

    res.json({
        message: 'User updated successfully',
        user,
        auto_enrollment: autoEnrollResult ? {
            enrolled_courses: autoEnrollResult.enrolled,
            courses: autoEnrollResult.courses
        } : null
    });
});
