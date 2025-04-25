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

// Get all week schedules
router.get("/", getAllWeekSchedules);

// Get active week schedules
router.get("/active", getActiveWeekSchedules);

// Create a new week schedule
router.post("/", createWeekSchedule);

// Update a week schedule
router.put("/:id", updateWeekSchedule);

// Toggle active status
router.patch("/:id/toggle-active", toggleActiveStatus);

// Delete a week schedule
router.delete("/:id", deleteWeekSchedule);

module.exports = router; 