const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { verifyToken } = require('../../../../auth/authMiddleware');

// Get leaderboard by subject
router.get('/subject/:subjectId', verifyToken, leaderboardController.getLeaderboardBySubject);

// Get student's rank
router.get('/rank/:subjectId', verifyToken, leaderboardController.getStudentRank);

// Update student points (internal use only)
router.post('/update-points', verifyToken, leaderboardController.updateStudentPoints);

module.exports = router; 