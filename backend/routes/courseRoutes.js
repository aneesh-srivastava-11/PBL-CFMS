const express = require('express');
const { createCourse, getCourses, getCourseById } = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
    .get(protect, getCourses)
    .post(protect, authorize('admin', 'faculty'), createCourse);

router.route('/:id')
    .get(protect, getCourseById)
    .delete(protect, authorize('admin', 'faculty'), require('../controllers/courseController').deleteCourse);

router.get('/:id/download', protect, authorize('admin', 'faculty', 'reviewer'), require('../controllers/courseController').downloadCourseZip);


module.exports = router;
