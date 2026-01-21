const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');
const router = express.Router();

const { loginSync } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // Need protect to verify token first

router.post('/login-sync', protect, loginSync);

module.exports = router;
