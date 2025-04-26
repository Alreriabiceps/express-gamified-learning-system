const express = require('express');
const router = express.Router();
const weeklyTestController = require('../controllers/weeklyTestController');
const { verifyToken, isAdmin } = require('../../../../auth/authMiddleware');

// Create a new weekly test (Admin only)
router.post('/', verifyToken, isAdmin, weeklyTestController.createWeeklyTest);

// Get all weekly tests
router.get('/', verifyToken, weeklyTestController.getAllWeeklyTests);

// Get weekly tests by subject
router.get('/subject/:subjectId', verifyToken, weeklyTestController.getWeeklyTestsBySubject);

// Get test results by student ID
router.get('/results/:studentId', verifyToken, weeklyTestController.getTestResultsByStudent);

// Update weekly test status (Admin only)
router.patch('/:testId/status', verifyToken, isAdmin, weeklyTestController.updateWeeklyTestStatus);

module.exports = router; 