const express = require('express');
const { body, param } = require('express-validator');
const { assignInstructorToSection, getCourseSections } = require('../controllers/coordinatorController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

// Assign Instructor
router.post('/courses/:courseId/sections',
    validate([
        param('courseId').isInt().withMessage('Course ID must be an integer'),
        body('instructorId').isInt().withMessage('Instructor ID must be an integer'),
        body('section').trim().notEmpty().withMessage('Section name is required')
    ]),
    assignInstructorToSection
);

// Get Sections (Used by HOD/Coordinator/Instructor)
router.get('/courses/:courseId/sections', getCourseSections);

// Get Faculties List (For assigning instructors) - Reusing HOD controller function
router.get('/faculties', require('../controllers/hodController').getAllFaculties);

module.exports = router;
