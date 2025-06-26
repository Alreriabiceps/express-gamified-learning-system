const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard');
const { verifyToken } = require('../../auth/middleware/authMiddleware');

// Dashboard routes
router.get('/dashboard', verifyToken, dashboardController.getDashboardData);

module.exports = router; 