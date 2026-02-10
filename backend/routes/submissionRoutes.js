const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    uploadSubmission,
    getMySubmissions,
    getSubmissionsForAssignment,
    gradeSubmission,
    markExemplar,
    getExemplarSubmissions,
    downloadSubmission
} = require('../controllers/submissionController');
const { protect } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Student routes
router.post('/:fileId', protect, upload.single('file'), uploadSubmission);
router.get('/my', protect, getMySubmissions);

// Instructor routes
router.get('/assignment/:fileId', protect, getSubmissionsForAssignment);
router.put('/:id/grade', protect, gradeSubmission);
router.put('/:id/exemplar', protect, markExemplar);

// Coordinator routes
router.get('/course/:courseId/exemplars', protect, getExemplarSubmissions);

// Download route
router.get('/:id/download', protect, downloadSubmission);

module.exports = router;
