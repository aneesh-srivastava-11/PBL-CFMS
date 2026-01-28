const Course = require('../models/courseModel');
const File = require('../models/fileModel');
const User = require('../models/userModel');

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
        } else if (req.user.role === 'student') {
            // Robust 2-step fetch to avoid association magic issues
            const Enrollment = require('../models/enrollmentModel');
            const enrollments = await Enrollment.findAll({
                where: { student_id: req.user.id },
                attributes: ['course_id']
            });
            const courseIds = enrollments.map(e => e.course_id);

            if (courseIds.length > 0) {
                courses = await Course.findAll({ where: { id: courseIds } });
            } else {
                courses = [];
            }
        } else {
            courses = await Course.findAll(); // Admin see all
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
const { getFileStream } = require('../utils/s3');

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

    console.log(`[DEBUG] generateCoursePDF Entry. User: ${req.user.id}, Role: ${req.user.role}, Coordinator: ${req.user.is_coordinator}`);

    // Check Coordinator Permission
    if (!req.user.is_coordinator && req.user.role !== 'admin') {
        console.log(`[DEBUG] Authorization failed. is_coordinator: ${req.user.is_coordinator}`);
        return res.status(403).json({ message: 'Only Course Coordinators can generate files.' });
    }

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

        console.log(`[DEBUG] generateCoursePDF: Found ${allFiles.length} files. Missing types: ${missingTypes.join(', ')}`);

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

        // Filter for PDFs and Images
        const mergeableFiles = allFiles.filter(f => {
            if (!f.filename) return false;
            const ext = f.filename.toLowerCase().split('.').pop();
            return ['pdf', 'png', 'jpg', 'jpeg'].includes(ext);
        });

        console.log(`[DEBUG] Found ${mergeableFiles.length} mergeable files (PDF/Image).`);

        for (const file of mergeableFiles) {
            try {
                let fileBuffer;
                if (process.env.AWS_BUCKET_NAME) {
                    // S3/Supabase Logic
                    try {
                        // Fetch stream from S3
                        const stream = await getFileStream(file.s3_key);
                        // Convert Stream to Buffer
                        const chunks = [];
                        for await (const chunk of stream) {
                            chunks.push(chunk);
                        }
                        fileBuffer = Buffer.concat(chunks);
                        console.log(`[DEBUG] Fetched from S3: ${file.filename}, Size: ${fileBuffer.length}`);
                    } catch (s3Error) {
                        console.error(`[ERROR] Failed to fetch from S3: ${file.filename}`, s3Error);
                        continue; // Skip this file
                    }
                } else {
                    const filePath = path.join(__dirname, '..', 'uploads', file.s3_key);
                    if (!fs.existsSync(filePath)) {
                        console.error(`[DEBUG] File missing on disk: ${filePath}`);
                        continue;
                    }
                    fileBuffer = fs.readFileSync(filePath);
                }

                const ext = file.filename.toLowerCase().split('.').pop();

                if (ext === 'pdf') {
                    const srcPdf = await PDFDocument.load(fileBuffer);
                    const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
                    copiedPages.forEach(p => mergedPdf.addPage(p));
                    console.log(`[DEBUG] Merged PDF: ${file.filename}`);
                } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
                    const imagePage = mergedPdf.addPage();
                    let image;
                    if (ext === 'png') {
                        image = await mergedPdf.embedPng(fileBuffer);
                    } else {
                        image = await mergedPdf.embedJpg(fileBuffer);
                    }

                    const { width, height } = image.scale(1);
                    // Fit image to page (A4 size approx 595x842)
                    const pageWidth = imagePage.getWidth();
                    const pageHeight = imagePage.getHeight();

                    // Logic to scale down if too big
                    const scaleFactor = Math.min((pageWidth - 100) / width, (pageHeight - 100) / height, 1);
                    const scaledWidth = width * scaleFactor;
                    const scaledHeight = height * scaleFactor;

                    imagePage.drawImage(image, {
                        x: (pageWidth - scaledWidth) / 2,
                        y: (pageHeight - scaledHeight) / 2,
                        width: scaledWidth,
                        height: scaledHeight,
                    });
                    console.log(`[DEBUG] Embedded Image: ${file.filename}`);
                }

            } catch (mergeError) {
                console.error(`[ERROR] Failed to merge file ${file.filename}:`, mergeError);
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
