const express = require('express');
const router = express.Router();

// Core routes
const authRoutes = require('../auth/authRoutes');
const questionRoutes = require('../users/admin/question/routes/questionRoutes');
const subjectRoutes = require('../users/admin/subject/routes/subjectRoutes');
const weekRoutes = require('../users/admin/week/routes/weekRoutes');
const dashboardRoutes = require('../users/admin/dashboard/routes/dashboardRoutes');

// Student routes
const studentRoutes = require('../users/admin/student/routes/studentRoutes');
const lobbyRoutes = require('../users/students/lobby/routes/lobbyRoutes');
const duelRoutes = require('../users/students/duel/routes/duelRoutes');
const weeklyTestRoutes = require('../users/students/weeklytest/routes/weeklyTestRoutes');
const leaderboardRoutes = require('../users/students/leaderboard/routes/leaderboardRoutes');

// Admin routes
const adminRoutes = require('../users/admin/routes/adminRoutes');

// Core routes
router.use('/auth', authRoutes);
router.use('/questions', questionRoutes);
router.use('/subjects', subjectRoutes);
router.use('/weeks', weekRoutes);
router.use('/admin/dashboard', dashboardRoutes);

// Student routes
router.use('/students', studentRoutes);
router.use('/lobby', lobbyRoutes);
router.use('/duel', duelRoutes);
router.use('/weeklytest', weeklyTestRoutes);
router.use('/leaderboard', leaderboardRoutes);

// Admin routes
router.use('/admin', adminRoutes);

module.exports = router; 