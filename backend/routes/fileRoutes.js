const express = require('express');
const { uploadFileHandler, getFileHandler, getFilesByCourseHandler, deleteFileHandler, toggleFileVisibilityHandler, downloadFileHandler, viewFileHandler } = require('../controllers/fileController');
const { toggleSubmissions } = require('../controllers/assignmentControlController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const router = express.Router();

router.post('/upload', protect, authorize('admin', 'faculty', 'hod'), upload.single('file'), uploadFileHandler); // Added HOD
router.delete('/:id', protect, authorize('admin', 'faculty', 'hod'), deleteFileHandler); // Added HOD
router.patch('/:id/visibility', protect, authorize('admin', 'faculty', 'hod'), toggleFileVisibilityHandler); // Added HOD
router.put('/:fileId/toggle-submissions', protect, authorize('admin', 'faculty', 'hod'), toggleSubmissions);
router.get('/course/:courseId', protect, getFilesByCourseHandler);
router.get('/:id/download', protect, downloadFileHandler);
router.get('/:id/view', protect, viewFileHandler); // New Route
router.get('/:key', protect, getFileHandler);

module.exports = router;
