const express = require('express');
const router = express.Router();
const { enrollStudent, getEnrolledStudents, bulkEnrollStudents, downloadTemplate, updateStudentDetails } = require('../controllers/enrollmentController');
const { protect } = require('../middleware/authMiddleware');
// const upload = require('../middleware/uploadMiddleware'); // Replaced with specialized middleware
const excelUpload = require('../middleware/excelUploadMiddleware');

router.get('/template', protect, downloadTemplate);
router.post('/:courseId', protect, enrollStudent);
router.post('/:courseId/bulk', protect, excelUpload.single('file'), bulkEnrollStudents); // Use excelUpload
router.put('/student/:studentId', protect, updateStudentDetails);
router.get('/:courseId', protect, getEnrolledStudents);

module.exports = router;
