const { uploadFile, getFileStream, deleteFile } = require('../utils/s3');
const fs = require('fs');
const util = require('util');
const path = require('path');
const unlinkFile = util.promisify(fs.unlink);
const File = require('../models/fileModel');

exports.uploadFileHandler = async (req, res) => {
    const file = req.file;
    const { course_id, file_type } = req.body; // Expect these from frontend

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        let s3Key = file.filename;
        let location = `/uploads/${file.filename}`;

        // Check if S3 is configured
        if (process.env.AWS_BUCKET_NAME) {
            const result = await uploadFile(file);
            await unlinkFile(file.path);
            s3Key = result.Key;
            location = result.Location;
        }

        // Save to Database
        if (course_id) {
            await File.create({
                course_id,
                file_type: file_type || 'other',
                filename: file.originalname,
                s3_key: s3Key
            });
        }

        res.json({
            message: 'File uploaded successfully',
            filePath: location,
            s3Key: s3Key,
            location: location
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error uploading file' });
    }
};

exports.getFilesByCourseHandler = async (req, res) => {
    try {
        const files = await File.findAll({ where: { course_id: req.params.courseId } });

        // If user is student, filter out hidden files
        if (req.user.role === 'student') {
            const visibleFiles = files.filter(f => f.is_visible);
            return res.json(visibleFiles);
        }

        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching files' });
    }
};

exports.toggleFileVisibilityHandler = async (req, res) => {
    try {
        const fileId = req.params.id;
        // Fetch file to get current status
        const file = await File.findByPk(fileId);
        if (!file) return res.status(404).json({ message: 'File not found' });

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
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Delete from File System or S3
        try {
            if (process.env.AWS_BUCKET_NAME) {
                await deleteFile(file.s3_key);
            } else {
                // Local delete
                const filePath = path.join(__dirname, '..', 'uploads', file.s3_key);
                if (fs.existsSync(filePath)) {
                    await unlinkFile(filePath);
                }
            }
        } catch (err) {
            console.error('Error deleting physical file:', err);
            // We might want to continue deleting the record even if physical delete fails
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

        // Check enrollment/permissions if needed, but 'protect' middleware should handle basic auth
        // Assuming protect is used.

        if (process.env.AWS_BUCKET_NAME) {
            // S3 Download
            try {
                const readStream = await getFileStream(file.s3_key);
                res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
                readStream.pipe(res);
            } catch (s3err) {
                console.error('S3 Download Error:', s3err);
                res.status(500).json({ message: 'Error retrieving file from Cloud' });
            }
        } else {
            // Local Download
            const filePath = path.join(__dirname, '..', 'uploads', file.s3_key);
            if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File on disk not found' });

            res.download(filePath, file.filename); // This sets Content-Disposition automatically
        }
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ message: 'Download failed' });
    }
};
