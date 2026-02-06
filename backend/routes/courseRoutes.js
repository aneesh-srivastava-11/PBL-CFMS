const express = require('express');
const { body } = require('express-validator');
const { createCourse, getCourses, getCourseById } = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const router = express.Router();

router.route('/')
    .get(protect, getCourses)
    .post(protect, authorize('admin', 'hod'),
        validate([
            body('course_code').trim().notEmpty().withMessage('Course Code is required'),
            body('course_name').trim().notEmpty().withMessage('Course Name is required'),
            body('semester').trim().notEmpty().withMessage('Semester is required')
        ]),
        createCourse
    );



router.route('/:id')
    .get(protect, getCourseById)
    .delete(protect, authorize('admin', 'hod'), require('../controllers/courseController').deleteCourse);

router.get('/:id/download', protect, authorize('admin', 'faculty', 'reviewer', 'hod'), require('../controllers/courseController').downloadCourseZip);
router.post('/:id/generate-pdf', protect, authorize('admin', 'faculty', 'hod'), require('../controllers/courseController').generateCoursePDF);



module.exports = router;
