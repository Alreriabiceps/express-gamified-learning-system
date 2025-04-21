const express = require('express');
const router = express.Router();
const authController = require('./authController');

// Student login route
router.post('/student-login', authController.studentLogin);

// Admin login route
router.post('/admin-login', authController.adminLogin);

module.exports = router;
