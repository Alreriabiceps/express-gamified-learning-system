// routes/subjectRoutes.js
const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subjectController");
const { verifyToken } = require('../../../../auth/authMiddleware');
// Make sure the path to the controller is correct relative to this file
// const subjectController = require("../controllers/subjectController");

// Routes
router.get("/", verifyToken, subjectController.getSubjects);
router.post("/", verifyToken, subjectController.createSubject);
router.put("/:id", verifyToken, subjectController.updateSubject);
router.delete("/:id", verifyToken, subjectController.deleteSubject);

module.exports = router;
