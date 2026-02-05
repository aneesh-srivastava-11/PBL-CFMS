const { uploadFile, getFileStream, deleteFile } = require('../utils/s3');
const fs = require('fs');
const util = require('util');
const path = require('path');
const os = require('os');
const unlinkFile = util.promisify(fs.unlink);
const { File, Course, Enrollment, CourseSection, User } = require('../models');

exports.uploadFileHandler = async (req, res) => {
    const file = req.file;
    const { course_id, file_type, section } = req.body; // 'section' is optional from frontend

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const course = await Course.findByPk(course_id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Logic: Who can upload where?
        let targetSection = null; // Default to Global

        if (req.user.role === 'admin' || req.user.role === 'hod') {
            // HOD/Admin can upload to any section or global
            targetSection = section || null;
        } else if (course.coordinator_id === req.user.id) {
            // Coordinator can upload to any section or global
            targetSection = section || null;
        } else if (req.user.role === 'faculty') {
            // Instructor? Check assignment
            const assignment = await CourseSection.findOne({
                where: { course_id, instructor_id: req.user.id }
            });

            if (!assignment) {
                return res.status(403).json({ message: 'You are not an instructor for this course.' });
            }

            // Instructor force-assigned to their section
            targetSection = assignment.section;
        } else {
            return res.status(403).json({ message: 'Students cannot upload course files.' });
        }


        let s3Key = file.filename;
        let location = `/uploads/${file.filename}`;

        // Check if S3 is configured
        if (process.env.AWS_BUCKET_NAME) {
            const result = await uploadFile(file);
            try {
                await unlinkFile(file.path);
            } catch (e) { console.error('Error deleting temp file', e); }
            s3Key = result.Key;
            location = result.Location;
        }

        // Save to Database
        const dbFile = await File.create({
            course_id,
            file_type: file_type || 'other',
            filename: file.originalname,
            s3_key: s3Key,
            section: targetSection,
            uploaded_by: req.user.id
        });

        res.json({
            message: 'File uploaded successfully',
            filePath: location,
            s3Key: s3Key,
            section: targetSection
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error uploading file' });
    }
};

exports.getFilesByCourseHandler = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        let whereClause = { course_id: courseId };

        // 1. HOD / Admin / Course Coordinator -> specific logic: See ALL
        const isCoordinator = (course.coordinator_id === userId);

        if (userRole === 'admin' || userRole === 'hod' || isCoordinator) {
            // See ALL files (Global + All Sections)
            // No redundant status update
        }
        // 2. Instructor -> See Global + Their Section
        else if (userRole === 'faculty') {
            const assignment = await CourseSection.findOne({
                where: { course_id: courseId, instructor_id: userId }
            });
            if (assignment) {
                // Determine logic: Can instructor see other sections? Usually no.
                // Visible: Section IS NULL OR Section == assignment.section
                const { Op } = require('sequelize');
                whereClause = {
                    course_id: courseId,
                    [Op.or]: [
                        { section: null },
                        { section: assignment.section }
                    ]
                };
            } else {
                // Not assigned? Maybe throw 403 or show empty
                return res.status(403).json({ message: 'Not assigned to this course.' });
            }
        }
        // 3. Student -> See Global + Their Section
        else if (userRole === 'student') {
            const enrollment = await Enrollment.findOne({
                where: { student_id: userId, course_id: courseId }
            });

            if (enrollment) {
                const { Op } = require('sequelize');
                whereClause = {
                    course_id: courseId,
                    is_visible: true, // Students only see visible files
                    [Op.or]: [
                        { section: null },
                        { section: enrollment.section }
                    ]
                };
            } else {
                return res.status(403).json({ message: 'Not enrolled in this course.' });
            }
        }

        const files = await File.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'uploader', attributes: ['name', 'role'] }
            ]
        });

        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching files' });
    }
};

exports.toggleFileVisibilityHandler = async (req, res) => {
    try {
        const fileId = req.params.id;
        const file = await File.findByPk(fileId);
        if (!file) return res.status(404).json({ message: 'File not found' });

        // Logic check: Only Uploader or Coordinator/HOD can toggle
        const course = await Course.findByPk(file.course_id);

        const canEdit = (
            req.user.role === 'admin' ||
            req.user.role === 'hod' ||
            course.coordinator_id === req.user.id ||
            file.uploaded_by === req.user.id
        );

        if (!canEdit) {
            return res.status(403).json({ message: 'Not authorized to modify this file.' });
        }

        const newStatus = !file.is_visible;
        await file.update({ is_visible: newStatus });

        res.json({ message: `File visibility set to ${newStatus}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating visibility' });
    }
};

exports.deleteFileHandler = async (req, res) => {
    try {
        const fileId = req.params.id;
        const file = await File.findByPk(fileId);
        if (!file) return res.status(404).json({ message: 'File not found' });

        const course = await Course.findByPk(file.course_id);

        const canDelete = (
            req.user.role === 'admin' ||
            req.user.role === 'hod' ||
            course.coordinator_id === req.user.id ||
            file.uploaded_by === req.user.id
        );

        if (!canDelete) {
            return res.status(403).json({ message: 'Not authorized to delete this file.' });
        }

        // Delete from File System or S3
        try {
            if (process.env.AWS_BUCKET_NAME) {
                await deleteFile(file.s3_key);
            } else {
                // Local delete
                const filePath = path.join(os.tmpdir(), file.s3_key);
                try {
                    await fs.promises.access(filePath);
                    await unlinkFile(filePath);
                } catch (err) { }
            }
        } catch (err) {
            console.error('Error deleting physical file:', err);
        }

        await file.destroy();
        res.json({ message: 'File removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting file' });
    }
};

exports.getFileHandler = async (req, res) => {
    try {
        const key = req.params.key;
        const readStream = await getFileStream(key);
        readStream.pipe(res);
    } catch (error) {
        console.error('File Stream Error:', error);
        res.status(404).json({ message: 'File not found or error accessing S3' });
    }
};

exports.downloadFileHandler = async (req, res) => {
    try {
        const file = await File.findByPk(req.params.id);
        if (!file) return res.status(404).json({ message: 'File not found' });

        if (process.env.AWS_BUCKET_NAME) {
            try {
                const readStream = await getFileStream(file.s3_key);
                res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
                res.setHeader('Content-Type', 'application/octet-stream');
                readStream.pipe(res);
            } catch (s3err) {
                console.error('S3 Download Error:', s3err);
                return res.status(500).json({ message: 'Error retrieving file from Cloud Storage' });
            }
        } else {
            const filePath = path.join(os.tmpdir(), file.s3_key);
            try {
                await fs.promises.access(filePath);
                res.download(filePath, file.filename);
            } catch (err) {
                return res.status(404).json({ message: 'File not found. Ensure S3 is configured for production.' });
            }
        }
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ message: 'Download failed' });
    }
};

exports.viewFileHandler = async (req, res) => {
    try {
        const file = await File.findByPk(req.params.id);
        if (!file) return res.status(404).json({ message: 'File not found' });

        if (process.env.AWS_BUCKET_NAME) {
            try {
                const readStream = await getFileStream(file.s3_key);
                res.setHeader('Content-Type', getContentType(file.filename));
                res.setHeader('Content-Disposition', 'inline'); // INLINE VIEW
                readStream.pipe(res);
            } catch (s3err) {
                console.error('S3 View Error:', s3err);
                return res.status(500).json({ message: 'Error retrieving file' });
            }
        } else {
            const filePath = path.join(os.tmpdir(), file.s3_key);
            try {
                await fs.promises.access(filePath);
                res.setHeader('Content-Type', getContentType(file.filename));
                res.setHeader('Content-Disposition', 'inline'); // INLINE VIEW
                res.sendFile(filePath);
            } catch (err) {
                return res.status(404).json({ message: 'File not found' });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error viewing file' });
    }
};

function getContentType(filename) {
    if (!filename) return 'application/octet-stream';
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
        case 'pdf': return 'application/pdf';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        default: return 'application/octet-stream';
    }
}
