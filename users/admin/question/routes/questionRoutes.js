const express = require("express");
const router = express.Router();
const {
  createQuestions,
  getQuestionsBySubject,
  editQuestion,
  deleteQuestion,
  generateQuestionsFromFile,
  generateQuestionsChat,
} = require("../controllers/questionController");
const { verifyToken } = require('../../../../auth/authMiddleware');
const multer = require('multer');
// Update storage to preserve original file extension
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split('.').pop();
    const base = file.fieldname + '-' + Date.now();
    cb(null, base + '.' + ext);
  }
});
const upload = multer({ storage: storage });

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

// Route to generate questions via chat prompt (protected route)
router.post("/generate-questions-chat", verifyToken, generateQuestionsChat);

module.exports = router;
