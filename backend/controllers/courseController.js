const Course = require('../models/courseModel');
const File = require('../models/fileModel');
const User = require('../models/userModel');
const Enrollment = require('../models/enrollmentModel');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');
const archiver = require('archiver');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const { getFileStream } = require('../utils/s3');
const { PDFDocument, rgb } = require('pdf-lib');
// ... (keep other imports)

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
            where: { student_id: req.user.id },
            include: [{
                model: Course,
                as: 'course',
                include: [includeCoordinators]
            }]
        });

        // Batch fetch all required sections to avoid N+1 queries
        const courseIds = enrollments.map(e => e.course_id);
        const userSections = enrollments.map(e => e.section).filter(Boolean);

        let sectionData = [];
        if (courseIds.length > 0 && userSections.length > 0) {
            sectionData = await CourseSection.findAll({
                where: {
                    course_id: courseIds,
                    section: userSections
                },
                include: [{ model: User, as: 'instructor', attributes: ['id', 'name'] }]
            });
        }

        const courseMap = new Map();
        for (const enrollment of enrollments) {
            const course = enrollment.course;
            if (course) {
                let instructor = null;
                if (enrollment.section) {
                    const specificSectionData = sectionData.find(sd => sd.course_id === course.id && sd.section === enrollment.section);
                    if (specificSectionData) instructor = specificSectionData.instructor;
                }

                const cJson = course.toJSON();
                cJson.my_section = enrollment.section;
                cJson.my_instructor = instructor;

                // Deduplicate by course ID
                courseMap.set(course.id, cJson);
            }
        }
        courses = Array.from(courseMap.values());

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

exports.getCourseFileStatus = asyncHandler(async (req, res) => {
    const courseId = req.params.id;

    const course = await Course.findByPk(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const allFiles = await File.findAll({ where: { course_id: courseId } });

    // Use the utility to validate against the 30 Theory / 20 Lab list
    const validationResult = validateCourseFiles(allFiles, course.course_type || 'theory');
    const requiredList = getRequiredFilesList(course.course_type || 'theory');

    res.json({
        course_code: course.course_code,
        course_type: course.course_type || 'theory',
        missing: validationResult.missing,
        present: validationResult.uploaded,
        required_list: requiredList,
        total_files: allFiles.length,
        total_required: validationResult.totalRequired
    });
});

exports.enqueueCoursePDF = asyncHandler(async (req, res) => {
    console.log('[DEBUG] enqueueCoursePDF Start');
    const courseId = req.params.id;
    const { pdfQueue } = require('../services/pdfQueue');

    console.log('[DEBUG] Fetching course:', courseId);
    const course = await Course.findByPk(courseId, {
        include: [{ model: User, as: 'coordinators', attributes: ['id'] }]
    });

    console.log('[DEBUG] Course fetched:', !!course);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const isCoord = course.coordinators && course.coordinators.some(c => c.id === req.user.id);
    if (!isCoord && !['admin', 'hod'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Only the assigned Course Coordinator, HOD, or Admin can generate files for this course.');
    }

    console.log('[DEBUG] Adding job to BullMQ...');
    // Add job to Queue
    const job = await pdfQueue.add('generate-pdf', {
        courseId,
        userId: req.user.id,
        userName: req.user.name
    });

    console.log('[DEBUG] Job added successfully:', job.id);
    res.status(202).json({ jobId: job.id, message: 'PDF generation queued' });
});

exports.getPDFStatus = asyncHandler(async (req, res) => {
    const { pdfQueue } = require('../services/pdfQueue');
    const { getPresignedDownloadUrl } = require('../utils/s3');
    const job = await pdfQueue.getJob(req.params.jobId);

    if (!job) {
        return res.status(404).json({ message: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;

    if (state === 'completed') {
        const result = job.returnvalue;
        if (!result.isLocal) {
            const downloadUrl = await getPresignedDownloadUrl(result.fileKey);
            return res.json({ state, progress, downloadUrl });
        } else {
            // Development fallback
            return res.json({ state, progress, localPath: result.fileKey });
        }
    }

    res.json({ state, progress });
});

/**
 * Validate if all required files are uploaded for a course
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

    // SMART VALIDATION: Check if students are enrolled (Auto-Generated List)
    const studentCount = await Enrollment.count({ where: { course_id: courseId } });

    if (studentCount > 0) {
        // Find indices of all "Name list of students" requirement variations (should be just one)
        const relevantFiles = validation.missing.filter(f => f.toLowerCase().includes('name list of students'));

        if (relevantFiles.length > 0) {
            // Remove from missing
            validation.missing = validation.missing.filter(f => !f.toLowerCase().includes('name list of students'));
            // Add to uploaded
            relevantFiles.forEach(f => validation.uploaded.push(f));

            // KEY FIX: Update the counts and valid status manually
            validation.totalUploaded = validation.uploaded.length;
            validation.valid = validation.missing.length === 0;

            // Note: totalRequired remains the same
        }
    }

    // Re-verify validity
    validation.valid = validation.missing.length === 0;

    res.json({
        course_type: course.course_type,
        valid: validation.valid,
        totalRequired: validation.totalRequired,
        totalUploaded: validation.totalUploaded,
        missing: validation.missing,
        uploaded: validation.uploaded,
        requiredFiles: requiredList,
        debug_info: {
            courseId: courseId,
            studentCount: studentCount,
            wasSmartChecked: studentCount > 0,
            // Re-check finding to see if we missed it
            wouldFind: requiredList.filter(f => f.toLowerCase().includes('name list of students'))
        }
    });
});

// @desc    Get aggregated course data for Dashboard
// @route   GET /api/courses/:id/dashboard
// @access  Private
exports.getCourseDashboard = asyncHandler(async (req, res) => {
    const courseId = req.params.id;
    const { CourseSection, User, File, Enrollment } = require('../models');

    const course = await Course.findByPk(courseId, {
        include: [{
            model: User,
            as: 'coordinators',
            attributes: ['id', 'name', 'email', 'phone_number'],
            through: { attributes: [] }
        }]
    });

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const [sections, files, studentCount] = await Promise.all([
        CourseSection.findAll({
            where: { course_id: courseId },
            include: [{ model: User, as: 'instructor', attributes: ['id', 'name', 'email'] }]
        }),
        File.findAll({
            where: { course_id: courseId },
            attributes: ['id', 'filename', 'file_type', 'uploaded_at', 'is_visible', 'section', 's3_key']
        }),
        req.user.role === 'student' ? Promise.resolve(0) : Enrollment.count({ where: { course_id: courseId } })
    ]);

    const { validateCourseFiles, getRequiredFilesList } = require('../utils/courseFileValidation');
    const validationResult = validateCourseFiles(files, course.course_type || 'theory');
    const requiredList = getRequiredFilesList(course.course_type || 'theory');

    if (studentCount > 0) {
        const relevantFiles = validationResult.missing.filter(f => f.toLowerCase().includes('name list of students'));
        if (relevantFiles.length > 0) {
            validationResult.missing = validationResult.missing.filter(f => !f.toLowerCase().includes('name list of students'));
            relevantFiles.forEach(f => validationResult.uploaded.push(f));
            validationResult.totalUploaded = validationResult.uploaded.length;
            validationResult.valid = validationResult.missing.length === 0;
        }
    }

    const fileStatus = {
        valid: validationResult.valid,
        totalRequired: validationResult.totalRequired,
        totalUploaded: validationResult.totalUploaded,
        missing: validationResult.missing,
        uploaded: validationResult.uploaded,
        requiredFiles: requiredList,
        course_type: course.course_type
    };

    res.json({ course, sections, files, fileStatus, studentCount });
});
