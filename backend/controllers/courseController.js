const Course = require('../models/courseModel');
const File = require('../models/fileModel');
const User = require('../models/userModel');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');
const archiver = require('archiver');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const { getFileStream } = require('../utils/s3');
const { PDFDocument } = require('pdf-lib');
const { validateCourseFiles, getRequiredFilesList } = require('../utils/courseFileValidation');

exports.createCourse = asyncHandler(async (req, res) => {
    const { course_code, course_name, semester, course_type } = req.body;
    const faculty_id = req.user.id;

    // Validate course_type
    if (course_type && !['theory', 'lab'].includes(course_type)) {
        res.status(400);
        throw new Error('Invalid course type. Must be "theory" or "lab"');
    }

    const course = await Course.create({
        course_code,
        course_name,
        semester,
        faculty_id,
        course_type: course_type || 'theory' // Default to theory if not provided
    });
    logger.info(`[Course] Created ${course_type || 'theory'} course ${course_code} by Faculty ${faculty_id}`);
    res.status(201).json(course);
});

exports.getCourses = asyncHandler(async (req, res) => {
    let courses;
    // FETCH COORDINATORS (Multiple)
    const includeCoordinators = {
        model: User,
        as: 'coordinators',
        attributes: ['id', 'name', 'email', 'phone_number'],
        through: { attributes: [] } // Don't include junction table data
    };

    if (req.user.role === 'faculty') {
        const { Op } = require('sequelize');
        const CourseSection = require('../models/courseSectionModel');

        // 1. Get courses where user is creator or coordinator (using new association)
        const directCourses = await Course.findAll({
            where: {
                faculty_id: req.user.id
            },
            include: [includeCoordinators]
        });

        // Also fetch where user is ONE of the coordinators
        const coordinatedCourses = await Course.findAll({
            include: [{
                model: User,
                as: 'coordinators',
                where: { id: req.user.id },
                attributes: ['id', 'name', 'email', 'phone_number'],
                through: { attributes: [] }
            }]
        });

        // Merge logic (simplified)
        const allDirect = [...directCourses, ...coordinatedCourses];

        // 2. Get courses where user is a section instructor
        const sectionAssignments = await CourseSection.findAll({
            where: { instructor_id: req.user.id },
            include: [{ model: Course, as: 'course', include: [includeCoordinators] }]
        });

        // 3. Merge and Deduplicate
        const courseMap = new Map();
        allDirect.forEach(c => courseMap.set(c.id, c));
        sectionAssignments.forEach(sa => {
            if (sa.course) courseMap.set(sa.course.id, sa.course);
        });

        // 4. Enrich with section info
        const enrichedCourses = Array.from(courseMap.values()).map(course => {
            const cJson = course.toJSON();
            // Re-attach coordinators if lost during merge (sequelize instances keep them, but best to be sure)

            const mySection = sectionAssignments.find(sa => sa.course_id === course.id);
            if (mySection) {
                cJson.my_section = mySection.section;
                cJson.my_instructor = {
                    id: req.user.id,
                    name: req.user.name
                };
            }
            return cJson;
        });

        courses = enrichedCourses;
    } else if (req.user.role === 'student') {
        const Enrollment = require('../models/enrollmentModel');
        const CourseSection = require('../models/courseSectionModel');

        const enrollments = await Enrollment.findAll({
            where: { student_id: req.user.id }
        });

        const courseData = [];
        for (const enrollment of enrollments) {
            const course = await Course.findByPk(enrollment.course_id, {
                include: [includeCoordinators]
            });

            if (course) {
                let instructor = null;
                if (enrollment.section) {
                    const sectionData = await CourseSection.findOne({
                        where: { course_id: course.id, section: enrollment.section },
                        include: [{ model: User, as: 'instructor', attributes: ['id', 'name'] }]
                    });
                    if (sectionData) instructor = sectionData.instructor;
                }

                const cJson = course.toJSON();
                cJson.my_section = enrollment.section;
                cJson.my_instructor = instructor;
                courseData.push(cJson);
            }
        }
        courses = courseData;

    } else {
        // Admin/HOD
        courses = await Course.findAll({
            include: [includeCoordinators]
        });
    }
    res.json(courses);
});

exports.getCourseById = asyncHandler(async (req, res) => {
    const course = await Course.findByPk(req.params.id);
    if (course) {
        res.json(course);
    } else {
        res.status(404);
        throw new Error('Course not found');
    }
});

exports.downloadCourseZip = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const course = await Course.findByPk(req.params.id);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const courseFiles = await File.findAll({ where: { course_id: req.params.id } });

    logger.info(`[ZIP] Starting zip for ${course.course_code} with ${courseFiles.length} files`);

    const archive = archiver('zip', {
        zlib: { level: 6 } // Reduced from 9 to 6 for better speed/compression balance
    });

    res.attachment(`${course.course_code}_files.zip`);
    archive.pipe(res);

    // Error handling for archive
    archive.on('error', (err) => {
        logger.error('[ZIP ERROR]', err);
        throw err;
    });

    // Progress logging
    archive.on('progress', (progress) => {
        logger.debug(`[ZIP PROGRESS] ${progress.entries.processed}/${progress.entries.total} files`);
    });

    if (courseFiles.length === 0) {
        archive.append('No files uploaded for this course yet.', { name: 'README.txt' });
    } else {
        // OPTIMIZATION 1 & 2: Parallel downloads + Direct streaming
        const filePromises = courseFiles.map(async (file) => {
            const folderName = file.file_type ? (file.file_type.charAt(0).toUpperCase() + file.file_type.slice(1)) : 'Other';

            try {
                if (process.env.AWS_BUCKET_NAME) {
                    // S3 storage - Stream directly to archive (no buffer!)
                    logger.debug(`[ZIP] Fetching ${file.filename} from S3...`);
                    const stream = await getFileStream(file.s3_key);

                    // DIRECT STREAMING - Memory efficient!
                    archive.append(stream, { name: `${folderName}/${file.filename}` });
                    logger.debug(`[ZIP] ✓ Added ${file.filename}`);
                } else {
                    // Local storage - Use async file check
                    const filePath = path.join(os.tmpdir(), file.s3_key);
                    try {
                        await fsPromises.access(filePath); // Check if file exists/accessible
                        archive.file(filePath, { name: `${folderName}/${file.filename}` });
                        logger.debug(`[ZIP] ✓ Added ${file.filename} (local)`);
                    } catch (fileError) {
                        logger.warn(`[ZIP] ⚠ File not found: ${file.filename}`);
                    }
                }
            } catch (error) {
                logger.error(`[ZIP] ✗ Failed to add ${file.filename}: ${error.message}`);
                // Add error note to zip instead of failing completely
                archive.append(`Failed to include: ${error.message}`, {
                    name: `${folderName}/_ERROR_${file.filename}.txt`
                });
            }
        });

        // Wait for all files to be added (parallel processing!)
        await Promise.all(filePromises);
    }

    // Finalize the archive
    await archive.finalize();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`[ZIP] ✓ Completed in ${duration}s`);
});

exports.deleteCourse = asyncHandler(async (req, res) => {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    await course.destroy();
    res.json({ message: 'Course deleted successfully' });
});

exports.generateCoursePDF = asyncHandler(async (req, res) => {
    const courseId = req.params.id;
    const { force } = req.body; // force=true to skip validation

    logger.debug(`[DEBUG] generateCoursePDF Entry. User: ${req.user.id}, Role: ${req.user.role}, Coordinator: ${req.user.is_coordinator}`);

    // Check Coordinator Permission
    if (!req.user.is_coordinator && req.user.role !== 'admin') {
        logger.warn(`[DEBUG] Authorization failed. is_coordinator: ${req.user.is_coordinator}`);
        res.status(403);
        throw new Error('Only Course Coordinators can generate files.');
    }

    const course = await Course.findByPk(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // 1. Validation Logic
    const allFiles = await File.findAll({ where: { course_id: courseId } });
    const presentTypes = new Set(allFiles.map(f => f.file_type));

    const requiredTypes = [
        'handout', 'attendance', 'assignment', 'marks',
        'academic_feedback', 'action_taken', 'exam_paper',
        'remedial', 'case_study', 'quiz', 'quiz_solution',
        'exam_solution', 'assignment_solution', 'materials'
    ];

    const missingTypes = requiredTypes.filter(type => !presentTypes.has(type));

    if (missingTypes.length > 0 && !force) {
        res.status(400).json({
            message: 'Missing required course files',
            missing: missingTypes
        });
        return; // Return explicitly here because we sent a JSON response already
    }

    logger.debug(`[DEBUG] generateCoursePDF: Found ${allFiles.length} files. Missing types: ${missingTypes.join(', ')}`);

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

    logger.debug(`[DEBUG] Found ${mergeableFiles.length} mergeable files (PDF/Image).`);

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
                    logger.debug(`[DEBUG] Fetched from S3: ${file.filename}, Size: ${fileBuffer.length}`);
                } catch (s3Error) {
                    logger.error(`[ERROR] Failed to fetch from S3: ${file.filename}`, s3Error);
                    continue; // Skip this file
                }
            } else {
                // Local storage - Use async file check
                const filePath = path.join(os.tmpdir(), file.s3_key);
                try {
                    await fsPromises.access(filePath); // Async file check
                    fileBuffer = await fsPromises.readFile(filePath);
                    logger.debug(`[DEBUG] Loaded from local: ${file.filename}, Size: ${fileBuffer.length}`);
                } catch (fileError) {
                    logger.warn(`[DEBUG] File missing on disk: ${filePath}`);
                    continue;
                }
            }

            const ext = file.filename.toLowerCase().split('.').pop();

            if (ext === 'pdf') {
                const srcPdf = await PDFDocument.load(fileBuffer);
                const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
                copiedPages.forEach(p => mergedPdf.addPage(p));
                logger.debug(`[DEBUG] Merged PDF: ${file.filename}`);
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
                logger.debug(`[DEBUG] Embedded Image: ${file.filename}`);
            }

        } catch (mergeError) {
            logger.error(`[ERROR] Failed to merge file ${file.filename}: ${mergeError.message}`);
        }
    }

    const pdfBytes = await mergedPdf.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${course.course_code}_CourseFile.pdf`);
    res.send(Buffer.from(pdfBytes));
});

/**
 * Validate if all required files are uploaded for a course
 * GET /api/courses/:id/validate-files
 */
exports.validateCourseFilesHandler = asyncHandler(async (req, res) => {
    const courseId = req.params.id;

    // Get course with type
    const course = await Course.findByPk(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // Get all uploaded files for this course
    const uploadedFiles = await File.findAll({
        where: { course_id: courseId },
        attributes: ['id', 'filename', 'file_type']
    });

    // Validate against required list
    const validation = validateCourseFiles(uploadedFiles, course.course_type);
    const requiredList = getRequiredFilesList(course.course_type);

    res.json({
        course_type: course.course_type,
        valid: validation.valid,
        totalRequired: validation.totalRequired,
        totalUploaded: validation.totalUploaded,
        missing: validation.missing,
        uploaded: validation.uploaded,
        requiredFiles: requiredList
    });
});
