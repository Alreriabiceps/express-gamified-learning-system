const express = require("express");
const router = express.Router();
const leaderboardController = require("../controllers/leaderboardController");
const { verifyToken } = require("../../../../auth/authMiddleware");

// Debug endpoint (should be removed in production)
router.get("/debug", verifyToken, leaderboardController.getDebugInfo);

// Get global weekly leaderboard (aggregated across all subjects)
router.get("/global", leaderboardController.getGlobalWeeklyLeaderboard);

// Get student's position in leaderboard
router.get(
  "/my-position",
  verifyToken,
  leaderboardController.getStudentPosition
);

// Get students near a specific rank
router.get(
  "/near-rank",
  verifyToken,
  leaderboardController.getStudentsNearRank
);

// Get trending performers
router.get(
  "/trending",
  verifyToken,
  leaderboardController.getTrendingPerformers
);

// Get PvP leaderboard
router.get("/pvp", verifyToken, leaderboardController.getPvpLeaderboard);

// Get leaderboard by subject
router.get("/subject", (req, res) => {
  const { subjectId } = req.query;
  if (!subjectId) {
    // Graceful fallback for frontend calls without subject
    return res.json({ success: true, leaderboard: [] });
  }
  // Delegate to controller with params-style API
  req.params.subjectId = subjectId;
  return leaderboardController.getLeaderboardBySubject(req, res);
});

// Get student's rank
router.get(
  "/rank/:subjectId",
  verifyToken,
  leaderboardController.getStudentRank
);

// Update student points (internal use only)
router.post(
  "/update-points",
  verifyToken,
  leaderboardController.updateStudentPoints
);

module.exports = router;
