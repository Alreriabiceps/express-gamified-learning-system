const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Core routes
const authRoutes = require('../auth/authRoutes');
const questionRoutes = require('../users/admin/question/routes/questionRoutes');
const subjectRoutes = require('../users/admin/subject/routes/subjectRoutes');
const weekRoutes = require('../users/admin/week/routes/weekRoutes');
const dashboardRoutes = require('../users/admin/dashboard/routes/dashboardRoutes');

// Student routes
const studentRoutes = require('../users/admin/student/routes/studentRoutes');
const lobbyRoutes = require('../users/students/lobby/routes/lobbyRoutes');
const duelRoutes = require('../users/students/duel/routes/duelRoutes');
const weeklyTestRoutes = require('../users/students/weeklytest/routes/weeklyTestRoutes');
const leaderboardRoutes = require('../users/students/leaderboard/routes/leaderboardRoutes');

// Admin routes
const adminRoutes = require('../users/admin/routes/adminRoutes');

// Match routes
const matchRoutes = require('../auth/matchRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/questions', questionRoutes);
router.use('/subjects', subjectRoutes);
router.use('/weeks', weekRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/students', studentRoutes);
router.use('/lobby', lobbyRoutes);
router.use('/duel', duelRoutes);
router.use('/weekly-test', weeklyTestRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/admin', adminRoutes);
router.use('/match', matchRoutes);

// Add AI question generation endpoint
router.post('/generate-questions', async (req, res) => {
  const { subjectId, bloomsLevel, topic, numQuestions } = req.body;
  const subjectName = subjectId;
  const n = Math.max(1, Math.min(10, Number(numQuestions) || 2));

  const prompt = `
Generate ${n} multiple-choice questions for the topic "${topic}" in the subject "${subjectName}" at the Bloom's Taxonomy level "${bloomsLevel}". 
Each question should have 4 choices and indicate the correct answer.

Respond ONLY with valid JSON in the following format, and nothing else:
[
  {
    "questionText": "...",
    "choices": ["...", "...", "...", "..."],
    "correctAnswer": "..."
  },
  ...
]
`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x7b-instruct",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    console.log('OpenRouter raw response:', JSON.stringify(data, null, 2));

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      return res.status(500).json({ error: "OpenRouter did not return choices as expected", details: data });
    }

    let questions;
    try {
      questions = JSON.parse(data.choices[0].message.content);
    } catch (err) {
      return res.status(500).json({ error: "AI response could not be parsed as JSON", raw: data.choices[0].message.content });
    }
    res.json(questions);
  } catch (err) {
    console.error("OpenRouter error:", err);
    res.status(500).json({ error: "Failed to generate questions", details: err.message });
  }
});

module.exports = router; 