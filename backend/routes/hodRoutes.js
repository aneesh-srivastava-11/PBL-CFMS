const express = require('express');
const router = express.Router(); // typo fixed below
const { createCourse, assignCoordinator, getAllFaculties, bulkAddFaculties, bulkAddStudents } = require('../controllers/hodController');
const { protect, requireHOD } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { body, param } = require('express-validator');
const validate = require('../middleware/validationMiddleware');

const expressRouter = express.Router();

expressRouter.use(protect);
expressRouter.use(requireHOD);

expressRouter.post('/courses',
    validate([
        body('course_code').trim().notEmpty().withMessage('Course Code is required'),
        body('course_name').trim().notEmpty().withMessage('Course Name is required'),
        body('semester').trim().notEmpty().withMessage('Semester is required')
    ]),
    createCourse
);

expressRouter.put('/courses/:courseId/coordinator',
    validate([
        param('courseId').isInt().withMessage('Course ID must be an integer'),
        body('facultyId').isInt().withMessage('Faculty ID must be an integer')
    ]),
    assignCoordinator
);
expressRouter.get('/faculties', getAllFaculties);

expressRouter.post('/bulk/faculties', upload.single('file'), bulkAddFaculties);
expressRouter.post('/bulk/students', upload.single('file'), bulkAddStudents);

// New Management Routes
expressRouter.post('/users',
    validate([
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('role').isIn(['student', 'faculty']).withMessage('Role must be student or faculty')
    ]),
    require('../controllers/hodController').createUser
);
expressRouter.get('/students', require('../controllers/hodController').getAllStudents);
expressRouter.put('/users/:id', require('../controllers/hodController').updateUser);

module.exports = expressRouter;
