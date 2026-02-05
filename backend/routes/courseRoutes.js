const express = require('express');
const { createCourse, getCourses, getCourseById } = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
    .get(protect, getCourses)
    .post(protect, authorize('admin', 'hod'), createCourse);

// Route to get list of faculties (for Coordinators to assign instructors)
router.get('/faculties-list', protect, authorize('admin', 'faculty', 'hod'), require('../controllers/hodController').getAllFaculties);

router.route('/:id')
    .get(protect, getCourseById)
    .delete(protect, authorize('admin', 'faculty', 'hod'), require('../controllers/courseController').deleteCourse);

router.get('/:id/download', protect, authorize('admin', 'faculty', 'reviewer', 'hod'), require('../controllers/courseController').downloadCourseZip);
router.post('/:id/generate-pdf', protect, authorize('admin', 'faculty', 'hod'), require('../controllers/courseController').generateCoursePDF);


// Route to get list of faculties (for Coordinators to assign instructors)
router.get('/faculties-list', protect, authorize('admin', 'faculty', 'hod'), require('../controllers/hodController').getAllFaculties);

module.exports = router;
