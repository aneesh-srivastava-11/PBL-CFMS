const express = require('express');
const { uploadFileHandler, getFileHandler, getFilesByCourseHandler, deleteFileHandler, toggleFileVisibilityHandler, downloadFileHandler, viewFileHandler } = require('../controllers/fileController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const router = express.Router();

router.post('/upload', protect, authorize('admin', 'faculty', 'hod'), upload.single('file'), uploadFileHandler); // Added HOD
router.delete('/:id', protect, authorize('admin', 'faculty', 'hod'), deleteFileHandler); // Added HOD
router.patch('/:id/visibility', protect, authorize('admin', 'faculty', 'hod'), toggleFileVisibilityHandler); // Added HOD
router.get('/course/:courseId', protect, getFilesByCourseHandler);
router.get('/:id/download', protect, downloadFileHandler);
router.get('/:id/view', protect, viewFileHandler); // New Route
router.get('/:key', protect, getFileHandler);

module.exports = router;
