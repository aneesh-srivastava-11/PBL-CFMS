const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');
const router = express.Router();

const { loginSync, toggleCoordinator } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // Need protect to verify token first

router.post('/login-sync', protect, loginSync);
router.put('/toggle-coordinator', protect, toggleCoordinator);

module.exports = router;
