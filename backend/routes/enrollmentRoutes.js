const express = require('express');
const router = express.Router();
const { enrollStudent, deleteEnrollment, getEnrolledStudents, bulkEnrollStudents, downloadTemplate, updateStudentDetails } = require('../controllers/enrollmentController');
const excelUpload = require('../middleware/excelUploadMiddleware');

router.get('/template', protect, downloadTemplate);
router.post('/:courseId', protect, enrollStudent);
router.delete('/:courseId/:studentId', protect, deleteEnrollment);
router.post('/:courseId/bulk', protect, excelUpload.single('file'), bulkEnrollStudents); // Reverted to generic memory middleware
router.put('/student/:studentId', protect, updateStudentDetails);
router.get('/:courseId', protect, getEnrolledStudents);

module.exports = router;
