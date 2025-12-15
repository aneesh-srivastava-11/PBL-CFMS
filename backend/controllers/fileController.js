const { uploadFile, getFileStream } = require('../utils/s3');
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
            await File.create(course_id, file_type || 'other', file.originalname, s3Key);
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
        const files = await File.findByCourseId(req.params.courseId);

        // If user is student, filter out hidden files
        if (req.user.role === 'student') {
            const visibleFiles = files.filter(f => f.is_visible);
            return res.json(visibleFiles);
        }

        res.json(files);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching files' });
    }
};

exports.toggleFileVisibilityHandler = async (req, res) => {
    try {
        const fileId = req.params.id;
        // Fetch file to get current status
        const file = await File.findById(fileId);
        if (!file) return res.status(404).json({ message: 'File not found' });

        const newStatus = !file.is_visible;
        await File.setVisibility(fileId, newStatus);

        res.json({ message: `File visibility set to ${newStatus}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating visibility' });
    }
};

exports.deleteFileHandler = async (req, res) => {
    try {
        const fileId = req.params.id;
        // In a real app we would query the file by ID first to get metadata
        // For now assuming we just verify existence and delete
        // We need a method in File model to findById

        // Since we don't have a direct File.findById yet, let's just delete the record for now
        // Ideally we delete the physical file too.
        // Let's modify this when we have robust file lookup.

        // Quick improvement: fetch file to get path
        const file = await File.findById(fileId);
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Delete from File System
        try {
            if (process.env.AWS_BUCKET_NAME) {
                // Future S3 delete logic
            } else {
                const filePath = path.join(__dirname, '..', 'uploads', file.s3_key); // s3_key stores filename in local mode
                if (fs.existsSync(filePath)) {
                    await unlinkFile(filePath);
                }
            }
        } catch (err) {
            console.error('Error deleting physical file:', err);
        }

        await File.delete(fileId);
        res.json({ message: 'File removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting file' });
    }
};

exports.getFileHandler = (req, res) => {
    const key = req.params.key;
    const readStream = getFileStream(key);
    readStream.pipe(res);
};
