const express = require("express");
const router = express.Router();
const authController = require("./authController");
const { verifyToken } = require("./authMiddleware");

// Add logging middleware for auth routes
router.use((req, res, next) => {
  console.log("\n=== Auth Route Accessed ===");
  console.log("Method:", req.method);
  console.log("Path:", req.path);
  console.log("Body:", req.body);
  console.log("=======================\n");
  next();
});

// Health check route
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Auth service is running",
  });
});

// Student login route
router.post("/student-login", authController.studentLogin);

// Admin login route
router.post("/admin-login", authController.adminLogin);

// Verify token
router.get("/verify", verifyToken, (req, res) => {
  res.status(200).json({ success: true });
});

// Refresh token
router.post("/refresh", verifyToken, authController.refreshToken);

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

// Debug route to check pending students (remove in production)
router.get("/debug-pending-students", async (req, res) => {
  try {
    const PendingStudent = require("../users/admin/student/models/pendingStudentModel");
    const pendingStudents = await PendingStudent.find({}).select(
      "email studentId confirmationToken confirmationExpires createdAt"
    );
    res.json({
      success: true,
      count: pendingStudents.length,
      students: pendingStudents,
    });
  } catch (error) {
    console.error("Debug pending students error:", error);
    res.status(500).json({
      error: "Error fetching pending students",
      details: error.message,
    });
  }
});

// Debug route to test token validation (remove in production)
router.get("/debug-token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const PendingStudent = require("../users/admin/student/models/pendingStudentModel");

    console.log("Debug token validation for:", token);
    console.log("Token length:", token ? token.length : 0);

    const pending = await PendingStudent.findOne({
      confirmationToken: token,
      confirmationExpires: { $gt: new Date() },
    });

    if (pending) {
      res.json({
        success: true,
        found: true,
        student: {
          email: pending.email,
          studentId: pending.studentId,
          tokenLength: pending.confirmationToken.length,
          expires: pending.confirmationExpires,
          isExpired: pending.confirmationExpires <= new Date(),
        },
      });
    } else {
      // Check if expired
      const expired = await PendingStudent.findOne({
        confirmationToken: token,
        confirmationExpires: { $lte: new Date() },
      });

      res.json({
        success: true,
        found: false,
        expired: !!expired,
        message: expired ? "Token found but expired" : "Token not found",
      });
    }
  } catch (error) {
    console.error("Debug token validation error:", error);
    res.status(500).json({
      error: "Error validating token",
      details: error.message,
    });
  }
});

// Password reset routes
router.post("/request-password-reset", authController.requestPasswordReset);
router.post("/reset-password", authController.resetPassword);

// Add error handling middleware
router.use((err, req, res, next) => {
  console.error("Auth route error:", err);
  res.status(500).json({ error: "Internal server error in auth routes" });
});

module.exports = router;
