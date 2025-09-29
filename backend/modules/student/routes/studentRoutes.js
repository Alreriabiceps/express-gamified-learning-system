const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { verifyToken } = require("../../auth/middleware/authMiddleware");
const {
  requireStudentApproval,
  checkStudentApproval,
} = require("../../auth/middleware/studentApprovalMiddleware");

// Route to add a student
router.post("/", verifyToken, studentController.addStudent);

// Route to get all students
router.get("/", verifyToken, studentController.getAllStudents);

// Get student by ID (browsing allowed, no approval required)
router.get(
  "/:id",
  verifyToken,
  checkStudentApproval,
  studentController.getStudentById
);

// Update student
router.put("/:id", verifyToken, studentController.updateStudent);

// Delete student
router.delete("/:id", verifyToken, studentController.deleteStudent);

module.exports = router;
