const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const {
  verifyToken,
  authenticateAdmin,
} = require("../../../../auth/authMiddleware");
const {
  getStudentPerformance,
} = require("../../dashboard/controllers/analyticsController");

// Route to add a student
router.post("/", verifyToken, studentController.addStudent);

// Route to get all students
router.get("/", verifyToken, studentController.getAllStudents);

// Get student by ID
router.get("/:id", verifyToken, studentController.getStudentById);

// Get student performance (admin)
router.get("/:id/performance", authenticateAdmin, getStudentPerformance);

// Update student
router.put("/:id", verifyToken, studentController.updateStudent);

// Delete student
router.delete("/:id", verifyToken, studentController.deleteStudent);

module.exports = router;
