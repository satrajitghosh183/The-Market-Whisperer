// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getMe
} = require('../controllers/authController');

// Import your auth middleware
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/auth/register
router.post('/register', registerUser);

// @route   POST /api/auth/login
router.post('/login', loginUser);

// @route   GET /api/auth/me
// This is a protected route, it requires a valid token
router.get('/me', protect, getMe);

module.exports = router;