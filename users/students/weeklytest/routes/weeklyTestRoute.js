// weeklyTestRoute.js
const express = require('express');
const router = express.Router();
const weeklyTestController = require('../controllers/weeklyTestController');

// Route to get questions based on subject and week
router.get('/weekquestions/:subject/:week', weeklyTestController.getQuestionsByWeek);

module.exports = router;
