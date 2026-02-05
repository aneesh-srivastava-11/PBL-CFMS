const { Course, User } = require('../models');

// @desc    Create a new course
// @route   POST /api/hod/courses
// @access  Private (HOD Only)
exports.createCourse = async (req, res) => {
    const { course_code, course_name, semester } = req.body;

    try {
        // HOD creates the course. 
        // Note: faculty_id in Course might be legacy, but we can set it to HOD's ID or the default coordinator if provided.
        // For now, let's set faculty_id to the HOD's ID (req.user.id) as the "Creator".

        const course = await Course.create({
            course_code,
            course_name,
            semester,
            faculty_id: req.user.id // Creator
        });

        res.status(201).json(course);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Assign a Coordinator to a Course
// @route   PUT /api/hod/courses/:courseId/coordinator
// @access  Private (HOD Only)
exports.assignCoordinator = async (req, res) => {
    const { courseId } = req.params;
    const { facultyId } = req.body;

    try {
        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const faculty = await User.findByPk(facultyId);
        if (!faculty || faculty.role !== 'faculty') {
            return res.status(400).json({ message: 'Invalid Faculty ID' });
        }

        course.coordinator_id = facultyId;
        await course.save();

        // Also update the faculty's status
        faculty.is_coordinator = true;
        await faculty.save();

        res.json({ message: `Assigned ${faculty.name} as coordinator for ${course.course_code}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get All Faculties (Use to select coordinator)
// @route   GET /api/hod/faculties
// @access  Private (HOD Only)
exports.getAllFaculties = async (req, res) => {
    try {
        const faculties = await User.findAll({
            where: { role: 'faculty' },
            attributes: ['id', 'name', 'email', 'phone_number']
        });
        res.json(faculties);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const ExcelJS = require('exceljs');
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

exports.bulkAddFaculties = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) { try { await unlinkFile(req.file.path); } catch (e) { } return res.status(400).json({ message: 'Invalid Excel' }); }

        const rows = [];
        const emails = new Set();
        const errors = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const name = row.getCell(1).text ? row.getCell(1).text.trim() : '';
            const email = row.getCell(2).text ? row.getCell(2).text.trim() : '';
            const phone = row.getCell(3).text ? row.getCell(3).text.trim() : '';

            if (!name || !email || !phone) { errors.push(`Row ${rowNumber}: Missing fields from ${rowNumber} name:${name}`); return; }
            if (emails.has(email)) { errors.push(`Row ${rowNumber}: Duplicate email`); return; }
            emails.add(email);
            rows.push({ name, email, phone_number: phone, role: 'faculty', password: 'password123' });
        });

        try { await unlinkFile(req.file.path); } catch (e) { }

        if (errors.length) return res.status(400).json({ message: 'Validation Failed', errors });
        if (!rows.length) return res.status(400).json({ message: 'File Empty' });

        const existing = await User.findAll({ where: { email: Array.from(emails) } });
        if (existing.length) return res.status(400).json({ message: 'Duplicates in DB', errors: existing.map(u => u.email) });

        await User.bulkCreate(rows);
        res.status(201).json({ message: `Added ${rows.length} faculties` });
    } catch (error) {
        console.error(error);
        try { await unlinkFile(req.file.path); } catch (e) { }
        res.status(500).json({ message: 'Error processing' });
    }
};

exports.bulkAddStudents = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) { try { await unlinkFile(req.file.path); } catch (e) { } return res.status(400).json({ message: 'Invalid Excel' }); }

        const rows = [];
        const emails = new Set();
        const errors = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const name = row.getCell(1).text ? row.getCell(1).text.trim() : '';
            const email = row.getCell(2).text ? row.getCell(2).text.trim() : '';
            const sem = row.getCell(3).text ? row.getCell(3).text.trim() : '';
            const sec = row.getCell(4).text ? row.getCell(4).text.trim() : '';

            if (!name || !email || !sem || !sec) { errors.push(`Row ${rowNumber}: Missing fields`); return; }
            if (emails.has(email)) { errors.push(`Row ${rowNumber}: Duplicate email`); return; }
            emails.add(email);
            rows.push({ name, email, role: 'student', academic_semester: sem, section: sec, password: 'password123' });
        });

        try { await unlinkFile(req.file.path); } catch (e) { }

        if (errors.length) return res.status(400).json({ message: 'Validation Failed', errors });
        if (!rows.length) return res.status(400).json({ message: 'File Empty' });

        const existing = await User.findAll({ where: { email: Array.from(emails) } });
        if (existing.length) return res.status(400).json({ message: 'Duplicates in DB', errors: existing.map(u => u.email) });

        await User.bulkCreate(rows);
        res.status(201).json({ message: `Added ${rows.length} students` });
    } catch (error) {
        console.error(error);
        try { await unlinkFile(req.file.path); } catch (e) { }
        res.status(500).json({ message: 'Error processing' });
    }
};

// @desc    Get All Students (HOD Global List)
// @route   GET /api/hod/students
// @access  Private (HOD Only)
exports.getAllStudents = async (req, res) => {
    try {
        const students = await User.findAll({
            where: { role: 'student' },
            attributes: ['id', 'name', 'email', 'section', 'academic_semester', 'phone_number']
        });
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update any User (HOD Global Edit)
// @route   PUT /api/hod/users/:id
// @access  Private (HOD Only)
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, section, academic_semester, phone_number } = req.body;

    try {
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name) user.name = name;
        if (section !== undefined) user.section = section; // Allow clearing
        if (academic_semester !== undefined) user.academic_semester = academic_semester;
        if (phone_number) user.phone_number = phone_number;

        await user.save();
        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
