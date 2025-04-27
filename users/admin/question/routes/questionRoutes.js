const express = require("express");
const router = express.Router();
const {
  createQuestions,
  getQuestionsBySubject,
  editQuestion,
  deleteQuestion,
} = require("../controllers/questionController");
const { verifyToken } = require('../../../../auth/authMiddleware');

// Route to create questions (protected route)
router.post("/", verifyToken, createQuestions);

// Route to get questions by subject (protected route)
router.get("/:subjectId", verifyToken, getQuestionsBySubject);

// Route to edit a question (protected route)
router.put("/:questionId", verifyToken, editQuestion);

// Route to delete a question (protected route)
router.delete("/:questionId", verifyToken, deleteQuestion);

module.exports = router;
