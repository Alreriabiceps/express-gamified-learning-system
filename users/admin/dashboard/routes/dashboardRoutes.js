const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateAdmin } = require('../../../../auth/authMiddleware');

// Get dashboard statistics
router.get('/stats', authenticateAdmin, dashboardController.getStats);

// Get recent activity
router.get('/activity', authenticateAdmin, dashboardController.getRecentActivity);

module.exports = router; 