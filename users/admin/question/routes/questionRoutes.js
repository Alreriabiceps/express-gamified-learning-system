const express = require('express');
const { createQuestions, getQuestionsBySubjectAndWeek } = require('../controllers/questionController');
const router = express.Router();

// Route to create questions
router.post('/', createQuestions);

// Route to get questions by subject and week
router.get('/:subject/:week', getQuestionsBySubjectAndWeek);

module.exports = router;
