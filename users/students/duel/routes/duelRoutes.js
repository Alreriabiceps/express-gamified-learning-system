const express = require('express');
const router = express.Router();
const duelController = require('../controllers/duelController');
const { verifyToken } = require('../../../../auth/authMiddleware');

// Challenge a student to a duel
router.post('/challenge', verifyToken, duelController.challengeDuel);

// Accept a duel challenge
router.post('/:duelId/accept', verifyToken, duelController.acceptDuel);

// Reject a duel challenge
router.post('/:duelId/reject', verifyToken, duelController.rejectDuel);

// Get all duels for a student
router.get('/my-duels', verifyToken, duelController.getStudentDuels);

module.exports = router; 