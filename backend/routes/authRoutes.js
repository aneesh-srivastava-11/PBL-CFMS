const express = require('express');
const router = express.Router();
const { loginSync, toggleCoordinator } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Firebase auth sync - Frontend sends Firebase token, backend syncs user to DB
router.post('/login-sync', protect, loginSync);

// Toggle coordinator status for faculty
router.put('/toggle-coordinator', protect, toggleCoordinator);

module.exports = router;
