const express = require("express");
const router = express.Router();
const {
  verifyToken,
  isAdmin,
} = require("../../auth/middleware/authMiddleware");
const studentController = require("../controllers/studentController");

// All routes require admin authentication
router.use(verifyToken);
router.use(isAdmin);

// Get all pending students (not yet approved)
router.get("/pending", studentController.getPendingStudents);

// Approve a student
router.patch("/:id/approve", studentController.approveStudent);

// Reject a student (delete their account)
router.delete("/:id/reject", studentController.rejectStudent);

module.exports = router;

