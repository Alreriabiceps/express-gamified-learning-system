const express = require('express');
const router = express.Router();
const authController = require('../auth/authController');
const { verifyToken } = require('../auth/authMiddleware');

// Student authentication
router.post('/student-login', authController.studentLogin);
router.post('/student-register', authController.studentRegister);

// Admin authentication
router.post('/admin-login', authController.adminLogin);
router.post('/admin-register', authController.adminRegister);

// Verify token
router.get('/verify', verifyToken, authController.verifyToken);

module.exports = router; 