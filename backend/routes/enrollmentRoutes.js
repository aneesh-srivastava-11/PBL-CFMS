const express = require('express');
const router = express.Router();
const { enrollStudent, getEnrolledStudents, bulkEnrollStudents } = require('../controllers/enrollmentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Re-use memory storage upload middleware

router.post('/:courseId', protect, enrollStudent);
router.post('/:courseId/bulk', protect, upload.single('file'), bulkEnrollStudents);
router.get('/:courseId', protect, getEnrolledStudents);

module.exports = router;
