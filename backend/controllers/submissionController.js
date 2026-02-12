const { uploadFile, getFileStream, deleteFile } = require('../utils/s3');
const fs = require('fs');
const util = require('util');
const path = require('path');
const os = require('os');
const unlinkFile = util.promisify(fs.unlink);
const { StudentSubmission, File, Course, Enrollment, CourseSection, User } = require('../models');
const { Op } = require('sequelize');

// Student uploads assignment solution
exports.uploadSubmission = async (req, res) => {
    const file = req.file;
    const { fileId } = req.params; // Assignment file ID

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        // 1. Validate assignment exists and is of type 'assignment'
        const assignmentFile = await File.findByPk(fileId);
        if (!assignmentFile) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        if (assignmentFile.file_type !== 'assignment') {
            return res.status(400).json({ message: 'This file is not an assignment' });
        }

        // 2. Validate student is enrolled in the course
        const enrollment = await Enrollment.findOne({
            where: {
                student_id: req.user.id,
                course_id: assignmentFile.course_id
            }
        });

        if (!enrollment) {
            return res.status(403).json({ message: 'You are not enrolled in this course' });
        }

        // 3. Check if submissions are enabled for this assignment
        if (!assignmentFile.submissions_enabled) {
            return res.status(403).json({ message: 'Submissions are not currently enabled for this assignment' });
        }

        // 4. Check if deadline has passed
        if (assignmentFile.submission_deadline && new Date() > new Date(assignmentFile.submission_deadline)) {
            return res.status(403).json({ message: 'Submission deadline has passed' });
        }

        // 5. Check for duplicate submission
        const existingSubmission = await StudentSubmission.findOne({
            where: {
                file_id: fileId,
                student_id: req.user.id
            }
        });

        if (existingSubmission) {
            return res.status(400).json({ message: 'You have already submitted for this assignment' });
        }

        // 6. Upload to S3
        let s3Key = file.filename;
        let location = `/uploads/${file.filename}`;

        if (process.env.AWS_BUCKET_NAME) {
            const result = await uploadFile(file);
            try {
                await unlinkFile(file.path);
            } catch (e) { console.error('Error deleting temp file', e); }
            s3Key = result.Key;
            location = result.Location;
        }

        // 7. Create submission record
        const submission = await StudentSubmission.create({
            file_id: fileId,
            student_id: req.user.id,
            course_id: assignmentFile.course_id,
            s3_key: s3Key,
            filename: file.originalname,
            submitted_at: new Date()
        });

        res.json({
            message: 'Submission uploaded successfully',
            submission,
            location
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error uploading submission' });
    }
};

// Student views their own submissions
exports.getMySubmissions = async (req, res) => {
    try {
        const submissions = await StudentSubmission.findAll({
            where: { student_id: req.user.id },
            include: [
                {
                    model: File,
                    as: 'assignment',
                    attributes: ['id', 'filename', 'file_type', 'course_id']
                },
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'course_name', 'course_code']
                },
                {
                    model: User,
                    as: 'grader',
                    attributes: ['id', 'name']
                }
            ],
            order: [['submitted_at', 'DESC']]
        });

        res.json(submissions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching submissions' });
    }
};

// Instructor views submissions for an assignment
exports.getSubmissionsForAssignment = async (req, res) => {
    try {
        const { fileId } = req.params;

        // 1. Validate assignment exists
        const assignmentFile = await File.findByPk(fileId);
        if (!assignmentFile) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // 2. Check instructor authorization (only see submissions from their section)
        const course = await Course.findByPk(assignmentFile.course_id);
        // Check authorization
        const isCoordinator = (await course.countCoordinators({ where: { id: req.user.id } })) > 0;
        const isAdmin = (req.user.role === 'admin' || req.user.role === 'hod');

        let whereClause = { file_id: fileId };

        if (!isAdmin && !isCoordinator) {
            // Instructor - only see their section
            const assignment = await CourseSection.findOne({
                where: {
                    course_id: assignmentFile.course_id,
                    instructor_id: req.user.id
                }
            });

            if (!assignment) {
                return res.status(403).json({ message: 'You are not assigned to this course' });
            }

            // Filter submissions by section
            const enrollments = await Enrollment.findAll({
                where: {
                    course_id: assignmentFile.course_id,
                    section: assignment.section
                },
                attributes: ['student_id']
            });

            const studentIds = enrollments.map(e => e.student_id);
            whereClause.student_id = { [Op.in]: studentIds };
        }

        // 3. Fetch submissions
        const submissions = await StudentSubmission.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'student',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: User,
                    as: 'grader',
                    attributes: ['id', 'name']
                }
            ],
            order: [['submitted_at', 'DESC']]
        });

        res.json(submissions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching submissions' });
    }
};

// Instructor grades a submission
exports.gradeSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { marks } = req.body;

        if (marks === undefined || marks === null) {
            return res.status(400).json({ message: 'Marks are required' });
        }

        const submission = await StudentSubmission.findByPk(id, {
            include: [{ model: File, as: 'assignment' }]
        });

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Check authorization
        const course = await Course.findByPk(submission.course_id);
        const isAdmin = (req.user.role === 'admin' || req.user.role === 'hod');

        let canGrade = isAdmin; // Only admin/HOD have auto-approval

        // Faculty (including coordinators) must teach the student's section to grade
        if (!canGrade && req.user.role === 'faculty') {
            // Check if instructor is assigned to student's section
            const enrollment = await Enrollment.findOne({
                where: {
                    student_id: submission.student_id,
                    course_id: submission.course_id
                }
            });

            if (enrollment) {
                const assignment = await CourseSection.findOne({
                    where: {
                        course_id: submission.course_id,
                        instructor_id: req.user.id,
                        section: enrollment.section
                    }
                });
                canGrade = !!assignment;
            }
        }

        if (!canGrade) {
            return res.status(403).json({ message: 'Not authorized to grade this submission' });
        }

        await submission.update({
            marks,
            graded_by: req.user.id,
            graded_at: new Date()
        });

        res.json({
            message: 'Submission graded successfully',
            submission
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error grading submission' });
    }
};

// Instructor marks submission as exemplar
exports.markExemplar = async (req, res) => {
    try {
        const { id } = req.params;
        const { exemplar_type } = req.body; // 'best', 'average', 'poor', or null

        if (exemplar_type && !['best', 'average', 'poor'].includes(exemplar_type)) {
            return res.status(400).json({ message: 'Invalid exemplar type' });
        }

        const submission = await StudentSubmission.findByPk(id);
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Check exemplar limit (Max 2 per type per assignment)
        if (exemplar_type) {
            const count = await StudentSubmission.count({
                where: {
                    file_id: submission.file_id,
                    exemplar_type: exemplar_type,
                    id: { [Op.ne]: id } // Exclude current submission if it's already marked (though logic below clears it, safer to check count of OTHERS)
                }
            });

            // Actually, we should check total count including this one if we are adding. 
            // Better logic: Count all with this file_id and exemplar_type.
            const existingCount = await StudentSubmission.count({
                where: {
                    file_id: submission.file_id,
                    exemplar_type: exemplar_type
                }
            });

            // If we are changing THIS submission to this type, and count is already 2, failure.
            // But if this submission IS one of the 2, it's fine.
            // So exclude current ID from count.
            const otherCount = await StudentSubmission.count({
                where: {
                    file_id: submission.file_id,
                    exemplar_type: exemplar_type,
                    id: { [Op.ne]: id }
                }
            });

            if (otherCount >= 2) {
                return res.status(400).json({ message: `Cannot mark more than 2 submissions as '${exemplar_type}'.` });
            }
        }

        // Check authorization (must teach the student's section to mark exemplar)
        const course = await Course.findByPk(submission.course_id);
        const isAdmin = (req.user.role === 'admin' || req.user.role === 'hod');

        let canMark = isAdmin; // Only admin/HOD have auto-approval

        // Faculty (including coordinators) must teach the student's section to mark exemplar
        if (!canMark && req.user.role === 'faculty') {
            const enrollment = await Enrollment.findOne({
                where: {
                    student_id: submission.student_id,
                    course_id: submission.course_id
                }
            });

            if (enrollment) {
                const assignment = await CourseSection.findOne({
                    where: {
                        course_id: submission.course_id,
                        instructor_id: req.user.id,
                        section: enrollment.section
                    }
                });
                canMark = !!assignment;
            }
        }

        if (!canMark) {
            return res.status(403).json({ message: 'Not authorized to mark this submission' });
        }

        // If setting an exemplar, clear any existing exemplar of the same type
        if (exemplar_type) {
            await StudentSubmission.update(
                { exemplar_type: null },
                {
                    where: {
                        file_id: submission.file_id,
                        exemplar_type
                    }
                }
            );
        }

        await submission.update({ exemplar_type });

        res.json({
            message: `Submission marked as ${exemplar_type || 'none'}`,
            submission
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error marking exemplar' });
    }
};

// Coordinator gets exemplar submissions for a course
exports.getExemplarSubmissions = async (req, res) => {
    try {
        const { courseId } = req.params;

        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check authorization
        // Check authorization
        const isCoordinator = (await course.countCoordinators({ where: { id: req.user.id } })) > 0;
        const isAdmin = (req.user.role === 'admin' || req.user.role === 'hod');

        if (!isAdmin && !isCoordinator) {
            return res.status(403).json({ message: 'Only coordinators and admins can view exemplars' });
        }

        const exemplars = await StudentSubmission.findAll({
            where: {
                course_id: courseId,
                exemplar_type: { [Op.not]: null } // Show submissions marked as exemplars (best/average/poor)
            },
            include: [
                {
                    model: File,
                    as: 'assignment',
                    attributes: ['id', 'filename', 'file_type', 'section']
                },
                {
                    model: User,
                    as: 'student',
                    attributes: ['id', 'name', 'email', 'section', 'academic_semester']
                }
            ],
            order: [['exemplar_type', 'ASC'], ['marks', 'DESC']]
        });

        // Enhance with enrollment section if different from user section
        const enhancedExemplars = await Promise.all(exemplars.map(async (exemplar) => {
            const enrollment = await Enrollment.findOne({
                where: {
                    student_id: exemplar.student_id,
                    course_id: courseId
                }
            });

            const exemplarData = exemplar.toJSON();
            if (enrollment) {
                exemplarData.enrollment_section = enrollment.section;
            }
            return exemplarData;
        }));

        res.json(enhancedExemplars);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching exemplars' });
    }
};

// Download submission file
exports.downloadSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const submission = await StudentSubmission.findByPk(id);

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Authorization check
        const course = await Course.findByPk(submission.course_id);
        // Check authorization
        const isCoordinator = (await course.countCoordinators({ where: { id: req.user.id } })) > 0;
        const isAdmin = (req.user.role === 'admin' || req.user.role === 'hod');
        const isStudent = (submission.student_id === req.user.id);

        let canDownload = isAdmin || isCoordinator || isStudent;

        if (!canDownload && req.user.role === 'faculty') {
            // Check if instructor
            const enrollment = await Enrollment.findOne({
                where: {
                    student_id: submission.student_id,
                    course_id: submission.course_id
                }
            });

            if (enrollment) {
                const assignment = await CourseSection.findOne({
                    where: {
                        course_id: submission.course_id,
                        instructor_id: req.user.id,
                        section: enrollment.section
                    }
                });
                canDownload = !!assignment;
            }
        }

        if (!canDownload) {
            return res.status(403).json({ message: 'Not authorized to download this submission' });
        }

        // Download file
        if (process.env.AWS_BUCKET_NAME) {
            const readStream = await getFileStream(submission.s3_key);
            res.setHeader('Content-Disposition', `attachment; filename="${submission.filename}"`);
            res.setHeader('Content-Type', 'application/pdf');
            readStream.pipe(res);
        } else {
            const filePath = path.join(os.tmpdir(), submission.s3_key);
            res.download(filePath, submission.filename);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error downloading submission' });
    }
};

// Coordinator toggles featured exemplar (double star for course file PDF)
exports.toggleFeaturedExemplar = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_featured } = req.body; // boolean

        const submission = await StudentSubmission.findByPk(id);
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Check if user is coordinator for this course
        const course = await Course.findByPk(submission.course_id);
        // Check authorization
        const isCoordinator = (await course.countCoordinators({ where: { id: req.user.id } })) > 0;
        const isAdmin = (req.user.role === 'admin' || req.user.role === 'hod');

        if (!isAdmin && !isCoordinator) {
            return res.status(403).json({ message: 'Only coordinators can mark featured exemplars' });
        }

        await submission.update({ is_featured_exemplar: is_featured });

        res.json({
            message: `Submission ${is_featured ? 'marked as featured' : 'unmarked as featured'}`,
            submission
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error toggling featured exemplar' });
    }
};
