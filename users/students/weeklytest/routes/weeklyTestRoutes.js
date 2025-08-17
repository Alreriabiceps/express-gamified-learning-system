const express = require('express');
const router = express.Router();
const weeklyTestController = require('../controllers/weeklyTestController');
const testResultController = require('../controllers/testResultController');
const { verifyToken, isAdmin } = require('../../../../auth/authMiddleware');

// Create a new weekly test (Admin only)
router.post('/', verifyToken, isAdmin, weeklyTestController.createWeeklyTest);

// Get all weekly tests
router.get('/', verifyToken, weeklyTestController.getAllWeeklyTests);

// Get weekly tests by subject
router.get('/subject/:subjectId', verifyToken, weeklyTestController.getWeeklyTestsBySubject);

// Save test result
router.post('/results', verifyToken, testResultController.saveTestResult);

// Get all test results for a specific student
router.get('/results/student/:studentId', verifyToken, testResultController.getTestResultsForStudent);

// Get details of a specific test result by its ID (replaces the old getTestStatistics route)
router.get('/results/:id', verifyToken, testResultController.getTestResultDetailsById);

// Update weekly test status (Admin only)
router.patch('/:testId/status', verifyToken, isAdmin, weeklyTestController.updateWeeklyTestStatus);

// New Learning Enhancement Routes
router.get('/progress/:studentId', verifyToken, testResultController.getStudyProgress);
router.get('/adaptive/:studentId', verifyToken, testResultController.getAdaptiveLearning);
router.get('/spaced-repetition/:studentId', verifyToken, testResultController.getSpacedRepetition);

module.exports = router; 