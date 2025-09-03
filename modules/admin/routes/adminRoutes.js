const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard");
const { verifyToken } = require("../../auth/middleware/authMiddleware");

// Get current admin profile (for refreshing user data)
router.get("/profile", verifyToken, dashboardController.getCurrentAdminProfile);

module.exports = router;
