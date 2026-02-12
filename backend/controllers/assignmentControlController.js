const { File, Course, CourseSection } = require('../models');

// Toggle submission status for an assignment
exports.toggleSubmissions = async (req, res) => {
    try {
        const { fileId } = req.params;
        const { enabled, deadline } = req.body; // enabled: boolean, deadline: ISO string or null

        const file = await File.findByPk(fileId);
        if (!file) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        if (file.file_type !== 'assignment') {
            return res.status(400).json({ message: 'This file is not an assignment' });
        }

        // Check authorization - only faculty who uploaded or coordinator/admin
        const course = await Course.findByPk(file.course_id);
        const isCoordinator = (await course.countCoordinators({ where: { id: req.user.id } })) > 0;
        const isAdmin = (req.user.role === 'admin' || req.user.role === 'hod');
        const isUploader = (file.uploaded_by === req.user.id);

        let canToggle = isAdmin || isCoordinator || isUploader;

        if (!canToggle && req.user.role === 'faculty') {
            // Check if instructor for this course
            const assignment = await CourseSection.findOne({
                where: {
                    course_id: file.course_id,
                    instructor_id: req.user.id
                }
            });
            canToggle = !!assignment;
        }

        if (!canToggle) {
            return res.status(403).json({ message: 'Not authorized to modify this assignment' });
        }

        // Update fields
        const updates = {};
        if (enabled !== undefined) {
            updates.submissions_enabled = enabled;
        }
        if (deadline !== undefined) {
            updates.submission_deadline = deadline ? new Date(deadline) : null;
        }

        await file.update(updates);

        res.json({
            message: 'Submission settings updated',
            submissions_enabled: file.submissions_enabled,
            submission_deadline: file.submission_deadline
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating submission settings' });
    }
};
