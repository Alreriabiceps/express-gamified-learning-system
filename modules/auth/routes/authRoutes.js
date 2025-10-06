const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const {
  verifyToken,
  verifyTokenIgnoreExp,
} = require("../middleware/authMiddleware");
const { loginRateLimiter } = require("../middleware/rateLimiter");

// Student login route with rate limiting
router.post("/student-login", loginRateLimiter, authController.studentLogin);

// Admin login route with rate limiting
router.post("/admin-login", loginRateLimiter, authController.adminLogin);

// Verify token
router.get("/verify", verifyToken, (req, res) => {
  res.status(200).json({ success: true });
});

// Refresh token (allow expired tokens)
router.post("/refresh", verifyTokenIgnoreExp, authController.refreshToken);

// Get current user profile (protected route)
router.get("/profile", verifyToken, authController.getProfile);

// Change password route (protected route)
router.post("/change-password", verifyToken, authController.changePassword);

// Change username route (protected route)
router.post("/change-username", verifyToken, authController.changeUsername);

// Student registration route
router.post("/student-register", authController.studentRegister);

// Email confirmation route
router.get("/confirm-email", authController.confirmEmail);

// Finalize registration route
router.get("/finalize-registration", authController.finalizeRegistration);

// Password reset routes
router.post("/request-password-reset", authController.requestPasswordReset);
router.post("/reset-password", authController.resetPassword);

// Add error handling middleware
router.use((err, req, res, next) => {
  console.error("Auth route error:", err);
  res.status(500).json({ error: "Internal server error in auth routes" });
});

module.exports = router;
