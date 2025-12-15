const Course = require('../models/courseModel');
const File = require('../models/fileModel'); // Added File Import at top (simulated here)

exports.createCourse = async (req, res) => {
    // ... existing ...
    const { course_code, course_name, semester } = req.body;
    const faculty_id = req.user.id;
    try {
        const courseId = await Course.create(course_code, course_name, semester, faculty_id);
        res.status(201).json({ id: courseId, course_code, course_name, semester, faculty_id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ... keep getCourses and getCourseById as is ...

exports.getCourses = async (req, res) => {
    try {
        let courses;
        if (req.user.role === 'faculty') {
            courses = await Course.findByFaculty(req.user.id);
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
        const course = await Course.findById(req.params.id);
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
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const courseFiles = await File.findByCourseId(req.params.id);

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
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        await Course.delete(req.params.id);
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
