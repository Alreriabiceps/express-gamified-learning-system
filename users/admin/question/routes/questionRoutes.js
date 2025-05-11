const express = require("express");
const router = express.Router();
const {
  createQuestions,
  getQuestionsBySubject,
  editQuestion,
  deleteQuestion,
  generateQuestionsFromFile,
} = require("../controllers/questionController");
const { verifyToken } = require('../../../../auth/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Route to create questions (protected route)
router.post("/", verifyToken, createQuestions);

// Route to get questions by subject (protected route)
router.get("/:subjectId", verifyToken, getQuestionsBySubject);

// Route to edit a question (protected route)
router.put("/:questionId", verifyToken, editQuestion);

// Route to delete a question (protected route)
router.delete("/:questionId", verifyToken, deleteQuestion);

// Route to generate questions from file (protected route)
router.post("/generate-questions-from-file", verifyToken, upload.single('file'), generateQuestionsFromFile);

module.exports = router;
