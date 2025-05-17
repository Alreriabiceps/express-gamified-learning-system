const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Assuming you might want to protect dashboard routes, 
// you would add authentication middleware here. e.g.:
// const { protect } = require('../../../auth/authMiddleware'); // Example path, adjust as needed

// GET weekly rank progression data
// If using auth middleware: router.get('/weekly-rank-progress', protect, dashboardController.getWeeklyRankProgress);
router.get('/weekly-rank-progress', dashboardController.getWeeklyRankProgress);

// You can add other dashboard-related routes here later
// router.get('/user-stats', dashboardController.getUserStats);
// router.get('/daily-streak', dashboardController.getDailyStreak);

module.exports = router; 