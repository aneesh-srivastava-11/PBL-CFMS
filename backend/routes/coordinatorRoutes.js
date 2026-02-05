const express = require('express');
const { assignInstructorToSection, getCourseSections } = require('../controllers/coordinatorController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Assign Instructor (Coordinator Only check is inside controller or we can add middleware)
router.post('/courses/:courseId/sections', assignInstructorToSection);

// Get Sections (Used by HOD/Coordinator/Instructor)
router.get('/courses/:courseId/sections', getCourseSections);

module.exports = router;
