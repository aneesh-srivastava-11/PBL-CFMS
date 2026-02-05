const express = require('express');
const router = express.Router(); // typo fixed below
const { createCourse, assignCoordinator, getAllFaculties, bulkAddFaculties, bulkAddStudents } = require('../controllers/hodController');
const { protect, requireHOD } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const expressRouter = express.Router();

expressRouter.use(protect);
expressRouter.use(requireHOD);

expressRouter.post('/courses', createCourse);
expressRouter.put('/courses/:courseId/coordinator', assignCoordinator);
expressRouter.get('/faculties', getAllFaculties);

expressRouter.post('/bulk/faculties', upload.single('file'), bulkAddFaculties);
expressRouter.post('/bulk/students', upload.single('file'), bulkAddStudents);

// New Management Routes
expressRouter.get('/students', require('../controllers/hodController').getAllStudents);
expressRouter.put('/users/:id', require('../controllers/hodController').updateUser);

module.exports = expressRouter;
