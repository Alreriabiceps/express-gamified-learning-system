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

// Bloom's Taxonomy instructions
const BLOOMS_INSTRUCTIONS = {
  Remembering: "Ask questions that require recall of facts or basic concepts.",
  Understanding: "Ask questions that require explaining ideas or concepts.",
  Applying: "Ask questions that require using information in new situations.",
  Analyzing: "Ask questions that require drawing connections among ideas.",
  Evaluating: "Ask questions that require justifying a decision or course of action.",
  Creating: "Ask questions that require producing new or original work."
};

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

  const bloomsInstruction = BLOOMS_INSTRUCTIONS[bloomsLevel] || "";
  const prompt = `
Generate ${n} multiple-choice questions for the topic "${topic}" in the subject "${subjectName}" at the Bloom's Taxonomy level "${bloomsLevel}".
${bloomsInstruction}
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
    // Google Gemini API call
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    console.log('Gemini raw response:', JSON.stringify(data, null, 2));

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
      return res.status(500).json({ error: "Gemini did not return content as expected", details: data });
    }

    let questions;
    try {
      let content = data.candidates[0].content.parts[0].text.trim();
      // Log the raw content for debugging
      console.log('Gemini raw content:', content);
      // Remove markdown code block if present
      if (content.startsWith('```json')) {
        content = content.replace(/^```json|```$/g, '').trim();
      } else if (content.startsWith('```')) {
        content = content.replace(/^```|```$/g, '').trim();
      }
      // Try to extract array from within text (ignore any text before/after the array)
      const match = content.match(/\[.*\]/s);
      if (match) {
        try {
          questions = JSON.parse(match[0]);
        } catch (e) {
          console.error('Failed to parse JSON from extracted array:', e, match[0]);
          return res.status(500).json({ error: 'AI response could not be parsed as JSON (array)', raw: match[0] });
        }
      } else {
        // Try to parse as JSON array directly
        try {
          questions = JSON.parse(content);
        } catch (e) {
          // Try to parse as a single object
          try {
            questions = [JSON.parse(content)];
          } catch (e2) {
            console.error('Failed to parse JSON from content:', e2, content);
            return res.status(500).json({ error: 'AI response could not be parsed as JSON (content)', raw: content });
          }
        }
      }
      // Ensure always an array
      if (!Array.isArray(questions)) {
        questions = [questions];
      }
    } catch (err) {
      console.error('Gemini parsing error:', err, data);
      return res.status(500).json({ error: 'Failed to parse Gemini response', details: err.message, raw: data });
    }
    res.json(questions);
  } catch (err) {
    console.error("Gemini error:", err);
    res.status(500).json({ error: "Failed to generate questions", details: err.message });
  }
});

// Admin Chatbot endpoint (Alreria)
router.post('/admin-chatbot', async (req, res) => {
  const { question } = req.body;
  const systemPrompt = `
You are a helpful assistant for a software system. 
Only answer questions related to how the system works, its features, and how to use it. 
Do not answer any questions that are not directly related to the system. 
Do not perform or suggest any modifications, deletions, updates, or administrative changes. 
If asked anything outside your scope, politely respond that you can only help with system-related questions.
`;
  const prompt = `
${systemPrompt}
You are Alreria, an expert assistant for the GLEAS admin system. Answer admin questions about using the dashboard, managing users, adding questions, generating AI questions, and other admin features. Be concise, clear, and friendly.\n\nAdmin: ${question}\nAlreria:`;
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    let answer = '';
    if (
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0].text
    ) {
      answer = data.candidates[0].content.parts[0].text.trim();
      // Remove markdown if present
      if (answer.startsWith('```')) {
        answer = answer.replace(/^```[a-z]*|```$/g, '').trim();
      }
    } else {
      answer = 'Sorry, Alreria could not generate a response.';
    }
    res.json({ answer });
  } catch (err) {
    console.error('Alreria error:', err);
    res.status(500).json({ error: 'Failed to get response from Alreria', details: err.message });
  }
});

// Simple Security Check Question endpoint
router.post('/generate-simple-security-question', async (req, res) => {
  const randomSeed = Math.floor(Math.random() * 1000000);
  const prompt = `
Generate a very simple security check question for a login page to prevent bots. The question should be basic math, logic, or common sense, and easy for a human to answer. Provide 3 multiple-choice options, only one of which is correct. Make sure the question is different from the last few you generated. Add some randomness. Respond ONLY with valid JSON in the following format, and nothing else:
{
  "questionText": "...",
  "choices": ["...", "...", "..."],
  "correctAnswer": "..."
}
Random seed: ${randomSeed}
`;
  console.log('Attempting to generate simple security question. API Key:', process.env.GEMINI_API_KEY ? 'Loaded' : 'NOT LOADED OR EMPTY');
  try {
    const fetchResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const responseText = await fetchResponse.text();
    console.log('Gemini API Status for security question:', fetchResponse.status);
    console.log('Gemini API Raw Response Text for security question:', responseText);

    if (!fetchResponse.ok) {
      return res.status(fetchResponse.status).json({ 
        error: 'Gemini API request failed',
        details: responseText 
      });
    }

    let data;
    try {
      data = JSON.parse(responseText); // Parse the raw text
    } catch (parseError) {
      console.error('Failed to parse Gemini API response text as JSON:', parseError);
      return res.status(500).json({ error: 'Gemini API response was not valid JSON', raw: responseText });
    }

    let questionObj = null;
    if (
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0].text
    ) {
      let content = data.candidates[0].content.parts[0].text.trim();
      console.log('Extracted content from Gemini for security question:', content);
      if (content.startsWith('```json')) {
        content = content.replace(/^```json|```$/g, '').trim();
      } else if (content.startsWith('```')) {
        content = content.replace(/^```|```$/g, '').trim();
      }
      try {
        questionObj = JSON.parse(content);
      } catch (e) {
        console.error('Failed to parse extracted content as JSON for security question:', e);
        // Keep questionObj as null, the next check will handle it.
      }
    }

    if (!questionObj) {
      console.error('Could not derive a valid question object. Gemini data:', JSON.stringify(data, null, 2));
      return res.status(500).json({ 
        error: 'Failed to generate security question from AI response',
        details: 'AI response structure might be unexpected or content parsing failed.',
        rawGeminiData: data // Send back the parsed Gemini data if available
      });
    }
    res.json(questionObj);
  } catch (err) {
    console.error('Overall error in /generate-simple-security-question:', err);
    res.status(500).json({ error: 'Failed to generate security question due to a server error', details: err.message });
  }
});

module.exports = router; 