const express = require('express');
const router = express.Router();
const authController = require('./authController');
const { verifyToken } = require('./authMiddleware');

// Student login route
router.post('/student-login', authController.studentLogin);

// Admin login route
router.post('/admin-login', authController.adminLogin);

// Verify token
router.get('/verify', verifyToken, (req, res) => {
    res.status(200).json({ success: true });
});

// Refresh token
router.post('/refresh', verifyToken, authController.refreshToken);

// Get current user profile (protected route)
router.get('/profile', verifyToken, authController.getProfile);

// Change password route (protected route)
router.post('/change-password', verifyToken, authController.changePassword);

// Change username route (protected route)
router.post('/change-username', verifyToken, authController.changeUsername);

module.exports = router;
