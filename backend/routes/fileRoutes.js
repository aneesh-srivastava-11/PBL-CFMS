const express = require('express');
const { uploadFileHandler, getFileHandler, getFilesByCourseHandler, deleteFileHandler, toggleFileVisibilityHandler, downloadFileHandler } = require('../controllers/fileController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const router = express.Router();

router.post('/upload', protect, authorize('admin', 'faculty'), upload.single('file'), uploadFileHandler);
router.delete('/:id', protect, authorize('admin', 'faculty'), deleteFileHandler);
router.patch('/:id/visibility', protect, authorize('admin', 'faculty'), toggleFileVisibilityHandler);
router.get('/course/:courseId', protect, getFilesByCourseHandler);
router.get('/:id/download', protect, downloadFileHandler);
router.get('/:key', protect, getFileHandler);

module.exports = router;
