const express = require("express");
const router = express.Router();
const {
  getAllWeekSchedules,
  getActiveWeekSchedules,
  createWeekSchedule,
  updateWeekSchedule,
  toggleActiveStatus,
  deleteWeekSchedule
} = require("../controllers/weekController");
const { verifyToken } = require('../../../../auth/authMiddleware');

// Get all week schedules
router.get("/", verifyToken, getAllWeekSchedules);

// Get active week schedules
router.get("/active", verifyToken, getActiveWeekSchedules);

// Create a new week schedule
router.post("/", verifyToken, createWeekSchedule);

// Update a week schedule
router.put("/:id", verifyToken, updateWeekSchedule);

// Toggle active status
router.patch("/:id/toggle-active", verifyToken, toggleActiveStatus);

// Delete a week schedule
router.delete("/:id", verifyToken, deleteWeekSchedule);

module.exports = router; 