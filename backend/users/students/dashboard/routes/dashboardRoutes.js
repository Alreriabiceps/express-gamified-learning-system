const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
// Note: routes are public in dev to avoid 401 while frontend lacks auth headers

// Weekly rank progression (mock)
router.get("/weekly-rank-progress", dashboardController.getWeeklyRankProgress);

// User stats (mock for now)
router.get("/user-stats", (req, res) => {
  res.json({
    username: "Innovator",
    mmr: 0,
    rankName: "Unranked",
    currentStreak: 0,
    projectsCompleted: 0,
  });
});

// Weekly challenges (mock for now)
router.get("/weekly-challenges", (req, res) => {
  res.json({
    hasActiveProjects: false,
    activeProjects: [],
  });
});

// Daily streak (mock for now)
router.get("/daily-streak", (req, res) => {
  res.json({
    currentStreakDays: 0,
    completedToday: false,
  });
});

module.exports = router;
