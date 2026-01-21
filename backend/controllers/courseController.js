const Course = require('../models/courseModel');
const File = require('../models/fileModel'); // Added File Import at top (simulated here)

exports.createCourse = async (req, res) => {
    // ... existing ...
    const { course_code, course_name, semester } = req.body;
    const faculty_id = req.user.id;
    try {
        const course = await Course.create({ course_code, course_name, semester, faculty_id });
        res.status(201).json(course);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCourses = async (req, res) => {
    try {
        let courses;
        if (req.user.role === 'faculty') {
            courses = await Course.findAll({ where: { faculty_id: req.user.id } });
        } else {
            courses = await Course.findAll();
        }
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCourseById = async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (course) {
            res.json(course);
        } else {
            res.status(404).json({ message: 'Course not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

exports.downloadCourseZip = async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const courseFiles = await File.findAll({ where: { course_id: req.params.id } }); // Sequelize

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        res.attachment(`${course.course_code}_files.zip`);
        archive.pipe(res);

        if (courseFiles.length === 0) {
            // Add a readme if empty
            archive.append('No files uploaded for this course yet.', { name: 'README.txt' });
        } else {
            for (const file of courseFiles) {
                // Determine folder name from file_type (capitalize first letter)
                const folderName = file.file_type ? (file.file_type.charAt(0).toUpperCase() + file.file_type.slice(1)) : 'Other';

                // If using local storage
                if (!process.env.AWS_BUCKET_NAME) {
                    const filePath = path.join(__dirname, '..', 'uploads', file.s3_key);
                    if (fs.existsSync(filePath)) {
                        // Append file into a folder based on type
                        archive.file(filePath, { name: `${folderName}/${file.filename}` });
                    }
                }
                // TODO: S3 logic would go here (download from S3 then append)
            }
        }

        archive.finalize();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Download failed' });
    }
};

exports.deleteCourse = async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        await course.destroy(); // Sequelize destroy instance
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const { PDFDocument } = require('pdf-lib');

exports.generateCoursePDF = async (req, res) => {
    const courseId = req.params.id;
    const { force } = req.body; // force=true to skip validation

    try {
        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // 1. Validation Logic
        const allFiles = await File.findAll({ where: { course_id: courseId } });
        const presentTypes = new Set(allFiles.map(f => f.file_type));

        const requiredTypes = [
            'handout', 'attendance', 'assignment', 'marks',
            'academic_feedback', 'action_taken', 'exam_paper',
            'remedial', 'case_study', 'quiz', 'quiz_solution',
            'exam_solution', 'assignment_solution'
        ];

        const missingTypes = requiredTypes.filter(type => !presentTypes.has(type));

        if (missingTypes.length > 0 && !force) {
            return res.status(400).json({
                message: 'Missing required course files',
                missing: missingTypes
            });
        }

        // 2. PDF Merge Logic
        const mergedPdf = await PDFDocument.create();

        // Add a Title Page
        const page = mergedPdf.addPage();
        const { width, height } = page.getSize();
        page.drawText(`Course File: ${course.course_code} - ${course.course_name}`, {
            x: 50,
            y: height - 100,
            size: 24,
        });

        // Filter for PDFs only for now (as per plan limitations)
        const pdfFiles = allFiles.filter(f => f.filename.toLowerCase().endsWith('.pdf'));

        for (const file of pdfFiles) {
            try {
                let fileBuffer;
                if (process.env.AWS_BUCKET_NAME) {
                    // S3 logic placeholder
                    continue;
                } else {
                    const filePath = path.join(__dirname, '..', 'uploads', file.s3_key);
                    if (fs.existsSync(filePath)) {
                        fileBuffer = fs.readFileSync(filePath);
                        const srcPdf = await PDFDocument.load(fileBuffer);
                        const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
                        copiedPages.forEach(page => mergedPdf.addPage(page));
                    }
                }
            } catch (err) {
                console.error(`Failed to merge file ${file.filename}:`, err);
                // Continue to next file
            }
        }

        const pdfBytes = await mergedPdf.save();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${course.course_code}_CourseFile.pdf`);
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating course file PDF', error: error.message });
    }
};
