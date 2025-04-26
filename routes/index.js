const express = require('express');
const router = express.Router();

// Core routes
const authRoutes = require('./auth');
const questionRoutes = require('./question');

// Student routes
const studentRoutes = require('./student');
const lobbyRoutes = require('../users/students/lobby/routes/lobbyRoutes');
const duelRoutes = require('../users/students/duel/routes/duelRoutes');
const weeklyTestRoutes = require('../users/students/weeklytest/routes/weeklyTestRoutes');
const leaderboardRoutes = require('../users/students/leaderboard/routes/leaderboardRoutes');

// Admin routes
const adminRoutes = require('./admin');

// Core routes
router.use('/auth', authRoutes);
router.use('/questions', questionRoutes);

// Student routes
router.use('/students', studentRoutes);
router.use('/lobbies', lobbyRoutes);
router.use('/duel', duelRoutes);
router.use('/weekly-test', weeklyTestRoutes);
router.use('/leaderboard', leaderboardRoutes);

// Admin routes
router.use('/admin', adminRoutes);

module.exports = router; 