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
            where: { student_id: req.user.id }
        });

        const courseMap = new Map();
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

exports.generateCoursePDF = asyncHandler(async (req, res) => {
    const courseId = req.params.id;
    // Import validation lists locally or at top level if possible, but for now inside function is fine or cleaner at top
    const { REQUIRED_FILES_THEORY, REQUIRED_FILES_LAB } = require('../utils/courseFileValidation');
    const Enrollment = require('../models/enrollmentModel');
    const User = require('../models/userModel');
    const sequelize = require('sequelize'); // Assuming sequelize is available or needs to be imported

    logger.debug(`[DEBUG] generateCoursePDF Entry. User: ${req.user.id}`);

    // Check Coordinator/HOD Permission
    if (!req.user.is_coordinator && !['admin', 'hod'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Only Course Coordinators, HODs, or Admins can generate files.');
    }

    const course = await Course.findByPk(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // 1. Fetch Uploaded Files
    const allFiles = await File.findAll({ where: { course_id: courseId } });

    // 2. Prepare Required List
    const requiredList = (course.course_type === 'lab') ? REQUIRED_FILES_LAB : REQUIRED_FILES_THEORY;

    // 3. Initialize PDF
    const mergedPdf = await PDFDocument.create();

    // --- TITLE PAGE ---
    const titlePage = mergedPdf.addPage();
    const { width, height } = titlePage.getSize();
    titlePage.drawText(`Course File: ${course.course_code} - ${course.course_name}`, {
        x: 50, y: height - 100, size: 24,
    });
    titlePage.drawText(`Generated on: ${new Date().toLocaleDateString()}`, {
        x: 50, y: height - 150, size: 12,
    });
    titlePage.drawText(`Faculty/Coordinator: ${req.user.name}`, {
        x: 50, y: height - 180, size: 12,
    });

    // 4. Iterate and Merge in Order
    for (const [index, requiredItem] of requiredList.entries()) {
        const itemNumber = index + 1;

        // Header Page for every item (Optional, but good for separation)
        // let separatorPage = mergedPdf.addPage();
        // separatorPage.drawText(`${itemNumber}. ${requiredItem}`, { x: 50, y: height/2, size: 18 });

        // A. SPECIAL CASE: "Name list of students" (Auto-Generate)
        if (requiredItem.toLowerCase().includes('name list of students')) {
            logger.debug(`[PDF] Auto-generating student list for item: ${requiredItem}`);

            // Fetch Students
            const enrollments = await Enrollment.findAll({
                where: { course_id: courseId },
                include: [{ model: User, as: 'student', attributes: ['name', 'email', 'section', 'phone_number'] }],
                order: [
                    ['section', 'ASC'],
                    [{ model: User, as: 'student' }, 'name', 'ASC']
                ]
            });

            // Create Student List Page(s)
            let currentListPage = mergedPdf.addPage();
            let y = height - 50;
            const fontSize = 10;
            const lineHeight = 15;

            // Title
            currentListPage.drawText(`${itemNumber}. ${requiredItem}`, { x: 50, y, size: 14, color: rgb(0, 0, 0.8) });
            y -= 30;

            // Table Header
            currentListPage.drawText('S.No', { x: 50, y, size: fontSize, font: await mergedPdf.embedFont('Helvetica-Bold') });
            currentListPage.drawText('Name', { x: 100, y, size: fontSize, font: await mergedPdf.embedFont('Helvetica-Bold') });
            currentListPage.drawText('Section', { x: 300, y, size: fontSize, font: await mergedPdf.embedFont('Helvetica-Bold') });
            currentListPage.drawText('Email', { x: 380, y, size: fontSize, font: await mergedPdf.embedFont('Helvetica-Bold') });
            y -= lineHeight * 1.5;

            // Table Rows
            const fontRegular = await mergedPdf.embedFont('Helvetica');
            enrollments.forEach((enrollment, idx) => {
                if (y < 50) {
                    currentListPage = mergedPdf.addPage();
                    y = height - 50;
                }
                const student = enrollment.student;
                const studName = student ? student.name : 'Unknown';
                const studEmail = student ? student.email : '-';
                const studSection = enrollment.section || '-';

                currentListPage.drawText(`${idx + 1}`, { x: 50, y, size: fontSize, font: fontRegular });
                currentListPage.drawText(studName.substring(0, 35), { x: 100, y, size: fontSize, font: fontRegular });
                currentListPage.drawText(studSection, { x: 300, y, size: fontSize, font: fontRegular });
                currentListPage.drawText(studEmail.substring(0, 35), { x: 380, y, size: fontSize, font: fontRegular });
                y -= lineHeight;
            });

            if (enrollments.length === 0) {
                currentListPage.drawText('(No students enrolled yet)', { x: 50, y, size: fontSize, font: fontRegular });
            }

            continue; // Move to next item
        }

        // B. STANDARD CASE: Look for Uploaded File
        // Fuzzy Match Logic (Same as validation utility)
        const matchedFile = allFiles.find(file => {
            const reqNormalized = requiredItem.toLowerCase().trim();
            const uploadedNormalized = (file.filename || '').toLowerCase().trim();
            // Check matching (uploaded name contains requirement OR requirement contains uploaded name 'type')
            // Actually relying on file_type if available is better? 
            // The file model has 'file_type'. But the list has descriptive text.
            // Let's rely on filenames or file_type?
            // Current validation logic uses filename checks. Let's stick to that for consistency with "Status Modal".
            return uploadedNormalized.includes(reqNormalized) || reqNormalized.includes(uploadedNormalized) || (file.file_type && reqNormalized.includes(file.file_type.replace(/_/g, ' ').toLowerCase()));
        });

        if (matchedFile) {
            logger.debug(`[PDF] Merging file for ${requiredItem}: ${matchedFile.filename}`);
            try {
                let fileBuffer;
                if (process.env.AWS_BUCKET_NAME) {
                    const stream = await getFileStream(matchedFile.s3_key);
                    const chunks = [];
                    for await (const chunk of stream) chunks.push(chunk);
                    fileBuffer = Buffer.concat(chunks);
                } else {
                    const filePath = path.join(os.tmpdir(), matchedFile.s3_key);
                    await fsPromises.access(filePath);
                    fileBuffer = await fsPromises.readFile(filePath);
                }

                // Merge PDF or Image
                const ext = matchedFile.filename.split('.').pop().toLowerCase();
                if (ext === 'pdf') {
                    const pdfToMerge = await PDFDocument.load(fileBuffer);
                    const indices = pdfToMerge.getPageIndices();
                    const copiedPages = await mergedPdf.copyPages(pdfToMerge, indices);
                    copiedPages.forEach(p => mergedPdf.addPage(p));
                } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
                    const imgPage = mergedPdf.addPage();
                    let embedding;
                    if (ext === 'png') embedding = await mergedPdf.embedPng(fileBuffer);
                    else embedding = await mergedPdf.embedJpg(fileBuffer);

                    const { width, height } = imgPage.getSize();
                    const dims = embedding.scaleToFit(width - 40, height - 40);
                    imgPage.drawImage(embedding, {
                        x: 20,
                        y: height - dims.height - 20,
                        width: dims.width,
                        height: dims.height,
                    });
                }
            } catch (err) {
                logger.error(`[PDF] Error merging ${matchedFile.filename}`, err);
                const errPage = mergedPdf.addPage();
                errPage.drawText(`${itemNumber}. ${requiredItem}`, { x: 50, y: height - 50, size: 14 });
                errPage.drawText(`ERROR: Could not merge file.`, { x: 50, y: height - 80, size: 12, color: rgb(1, 0, 0) });
            }
        } else {
            // File Missing Placeholder
            // Only add placeholder if it's NOT the auto-generated one (which we handled above)
            const placeholder = mergedPdf.addPage();
            placeholder.drawText(`${itemNumber}. ${requiredItem}`, { x: 50, y: height - 50, size: 14 });
            placeholder.drawText(`(File Not Uploaded)`, { x: 50, y: height - 100, size: 12, color: rgb(0.5, 0.5, 0.5) });
        }
    }

    // Finalize
    const pdfBytes = await mergedPdf.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${course.course_code}_course_file.pdf`);
    res.send(Buffer.from(pdfBytes));
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
