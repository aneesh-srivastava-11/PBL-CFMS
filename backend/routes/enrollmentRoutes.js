const express = require('express');
const router = express.Router();
const { enrollStudent, getEnrolledStudents } = require('../controllers/enrollmentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/:courseId', protect, enrollStudent);
router.get('/:courseId', protect, getEnrolledStudents);

module.exports = router;
