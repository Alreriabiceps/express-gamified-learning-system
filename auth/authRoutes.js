const express = require('express');
const router = express.Router();
const authController = require('./authController');
const { verifyToken } = require('./authMiddleware');

// Student login route
router.post('/student-login', authController.studentLogin);

// Admin login route
router.post('/admin-login', authController.adminLogin);

// Get current user profile (protected route)
router.get('/profile', verifyToken, authController.getProfile);

module.exports = router;
