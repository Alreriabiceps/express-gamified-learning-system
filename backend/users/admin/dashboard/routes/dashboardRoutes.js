const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const analyticsController = require("../controllers/analyticsController");
const { authenticateAdmin } = require("../../../../auth/authMiddleware");

// Get dashboard statistics
router.get("/stats", authenticateAdmin, dashboardController.getStats);

// Get recent activity
router.get(
  "/activity",
  authenticateAdmin,
  dashboardController.getRecentActivity
);

// Analytics overview
router.get("/analytics", authenticateAdmin, analyticsController.getAnalytics);

module.exports = router;
