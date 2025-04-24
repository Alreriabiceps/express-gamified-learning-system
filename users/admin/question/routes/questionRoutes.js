const express = require("express");
const {
  createQuestions,
  getQuestionsBySubject,
  editQuestion,
  deleteQuestion,
} = require("../controllers/questionController");
const router = express.Router();

// Route to create questions
router.post("/", createQuestions);

// Route to get questions by subject
// Route to get questions by subject
router.get("/:subjectId", getQuestionsBySubject);

// Route to edit a question (using PUT for editing)
router.put("/:questionId", editQuestion); // Pass both subjectId and questionId

// Route to delete a question
router.delete("/:questionId", deleteQuestion);
// Pass both subjectId and questionId

module.exports = router;
