const express = require("express");
const router = express.Router();
const pvpMatchController = require("../controllers/pvpMatchController");
const { verifyToken } = require("../../../../auth/authMiddleware");

// Create a new PvP match
router.post("/matches", verifyToken, pvpMatchController.createMatch);

// Complete a PvP match
router.put(
  "/matches/:matchId/complete",
  verifyToken,
  pvpMatchController.completeMatch
);

// Get match by room ID
router.get(
  "/matches/room/:roomId",
  verifyToken,
  pvpMatchController.getMatchByRoom
);

// Get player's match history
router.get(
  "/players/:playerId/matches",
  verifyToken,
  pvpMatchController.getPlayerMatches
);

// Get player's PvP statistics
router.get(
  "/players/:playerId/stats",
  verifyToken,
  pvpMatchController.getPlayerStats
);

// Get PvP leaderboard
router.get("/leaderboard", verifyToken, pvpMatchController.getLeaderboard);

module.exports = router;
