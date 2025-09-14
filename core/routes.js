console.log("core/routes.js loaded");
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const {
  generateQuestionsChat,
} = require("../users/admin/question/controllers/questionController");
const { authenticateAdmin } = require("../auth/authMiddleware");
const analyticsController = require("../users/admin/dashboard/controllers/analyticsController");

// Core routes
const authRoutes = require("../auth/authRoutes");
const questionRoutes = require("../users/admin/question/routes/questionRoutes");
const subjectRoutes = require("../users/admin/subject/routes/subjectRoutes");
const weekRoutes = require("../users/admin/week/routes/weekRoutes");
const dashboardRoutes = require("../users/admin/dashboard/routes/dashboardRoutes");

// Student routes
const studentRoutes = require("../users/admin/student/routes/studentRoutes");
const studentSelfRoutes = require("../modules/student/routes/studentRoutes"); // Add student self-access routes
const studentApprovalRoutes = require("../modules/student/routes/studentApprovalRoutes"); // Add student approval routes
const lobbyRoutes = require("../users/students/lobby/routes/lobbyRoutes");
const duelRoutes = require("../users/students/duel/routes/duelRoutes");
const gameRoutes = require("../users/students/game/routes/gameRoutes");
const weeklyTestRoutes = require("../users/students/weeklytest/routes/weeklyTestRoutes");
const leaderboardRoutes = require("../users/students/leaderboard/routes/leaderboardRoutes");
const pvpMatchRoutes = require("../users/students/pvp/routes/pvpMatchRoutes");
const teamWeeklyTestRoutes = require("../users/students/teamtest/routes/teamWeeklyTestRoutes");
const friendRequestRoutes = require("../users/students/chats/routes/friendRequestRoutes");
const messageRoutes = require("../users/students/chats/routes/messageRoutes");
const favoriteReviewerRoutes = require("../users/admin/reviewer/routes/favoriteReviewerRoutes");

// Admin routes
const adminRoutes = require("../users/admin/account/routes/adminRoutes");
const reviewerLinkRoutes = require("../users/admin/reviewer/routes/reviewerLinkRoutes");

// Match routes
const matchRoutes = require("../auth/matchRoutes");

// Bloom's Taxonomy instructions
const BLOOMS_INSTRUCTIONS = {
  Remembering: "Ask questions that require recall of facts or basic concepts.",
  Understanding: "Ask questions that require explaining ideas or concepts.",
  Applying: "Ask questions that require using information in new situations.",
  Analyzing: "Ask questions that require drawing connections among ideas.",
  Evaluating:
    "Ask questions that require justifying a decision or course of action.",
  Creating: "Ask questions that require producing new or original work.",
};

// Mount routes
router.use("/auth", authRoutes);
router.use("/questions", questionRoutes);
router.use("/subjects", subjectRoutes);
router.use("/weeks", weekRoutes);
router.use("/admin/dashboard", dashboardRoutes);
router.use("/admin/reviewer-links", reviewerLinkRoutes);
router.use("/admin/students", studentRoutes); // Fixed: changed from /students to /admin/students
router.use("/students/favorite-reviewers", favoriteReviewerRoutes);
router.use("/students", studentSelfRoutes); // Add route for students to access their own data
router.use("/student-approval", studentApprovalRoutes); // Add student approval routes
router.use("/lobby", lobbyRoutes);
router.use("/duel", duelRoutes);
router.use("/game", gameRoutes);
router.use("/weekly-test", weeklyTestRoutes);
router.use("/teamtest", teamWeeklyTestRoutes);
router.use("/leaderboard", leaderboardRoutes);
router.use("/pvp", pvpMatchRoutes);
router.use("/friend-requests", friendRequestRoutes);
router.use("/messages", messageRoutes);
router.use("/admin/users", adminRoutes);
router.use("/match", matchRoutes);

// Admin Analytics (top-level to match frontend path /api/admin/analytics)
router.get(
  "/admin/analytics",
  authenticateAdmin,
  analyticsController.getAnalytics
);

// Add AI question generation endpoint
router.post("/generate-questions", async (req, res) => {
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
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    console.log("Gemini raw response:", JSON.stringify(data, null, 2));

    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content ||
      !data.candidates[0].content.parts ||
      !data.candidates[0].content.parts[0].text
    ) {
      return res.status(500).json({
        error: "Gemini did not return content as expected",
        details: data,
      });
    }

    let questions;
    try {
      let content = data.candidates[0].content.parts[0].text.trim();
      // Log the raw content for debugging
      console.log("Gemini raw content:", content);
      // Remove markdown code block if present
      if (content.startsWith("```json")) {
        content = content.replace(/^```json|```$/g, "").trim();
      } else if (content.startsWith("```")) {
        content = content.replace(/^```|```$/g, "").trim();
      }
      // Try to extract array from within text (ignore any text before/after the array)
      const match = content.match(/\[.*\]/s);
      if (match) {
        try {
          questions = JSON.parse(match[0]);
        } catch (e) {
          console.error(
            "Failed to parse JSON from extracted array:",
            e,
            match[0]
          );
          return res.status(500).json({
            error: "AI response could not be parsed as JSON (array)",
            raw: match[0],
          });
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
            console.error("Failed to parse JSON from content:", e2, content);
            return res.status(500).json({
              error: "AI response could not be parsed as JSON (content)",
              raw: content,
            });
          }
        }
      }
      // Ensure always an array
      if (!Array.isArray(questions)) {
        questions = [questions];
      }
    } catch (err) {
      console.error("Gemini parsing error:", err, data);
      return res.status(500).json({
        error: "Failed to parse Gemini response",
        details: err.message,
        raw: data,
      });
    }
    res.json(questions);
  } catch (err) {
    console.error("Gemini error:", err);
    res
      .status(500)
      .json({ error: "Failed to generate questions", details: err.message });
  }
});

// Enhanced Admin Chatbot endpoint (Alreria)
router.post("/admin-chatbot", async (req, res) => {
  const { question, originalQuestion, currentPath } = req.body;

  // Enhanced system prompt with better context
  const systemPrompt = `
You are Alreria, an expert AI assistant for the GLEAS (Gamified Learning Environment and Assessment System) admin panel.

SYSTEM OVERVIEW:
- GLEAS is a comprehensive educational platform combining gamification with learning management
- It includes student management, question banks, AI-powered generation, test scheduling, and analytics
- The admin panel provides tools for managing all aspects of the educational system

CORE ADMIN FEATURES:
1. Dashboard - Real-time insights, metrics, and quick actions
2. Question Management - Create, edit, organize questions with AI generation
3. Student Management - Add, manage, and track student accounts
4. Subject Management - Organize academic subjects and content
5. Test Scheduling - Schedule and manage weekly tests and assessments
6. Analytics - Comprehensive reporting and performance tracking
7. Gamification - Points, badges, leaderboards, and engagement features

AI QUESTION GENERATION:
- Three methods: Topic-based, File upload (PDF/DOCX/PPTX), Chat-style
- Supports all Bloom's Taxonomy levels (Remembering to Creating)
- Generates 1-15 questions per batch
- Custom prompts and validation

STUDENT MANAGEMENT:
- Required fields: First Name, Last Name, Student ID, Grade, Section, Track, Password
- Tracks: Academic Track, Technical-Professional Track
- Grades: 11, 12
- Bulk operations: CSV import/export, password reset

QUESTION VALIDATION:
- Required: Question text, correct answer, subject, Bloom's level
- Multiple choice: 2-6 options
- Student ID must be unique
- Password minimum 6 characters

RESPONSE GUIDELINES:
1. Be specific about GLEAS features and functionality
2. Provide step-by-step instructions with UI references
3. Include validation rules and requirements
4. Suggest related features or next steps
5. Be helpful, concise, and professional
6. If unsure, ask for clarification
7. Focus on admin-specific tasks and workflows

Current context: ${currentPath || "General admin panel"}
Original question: ${originalQuestion || question}
`;

  const prompt = `${systemPrompt}\n\nAdmin: ${question}\n\nAlreria:`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    const data = await response.json();
    let answer = "";

    if (
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0].text
    ) {
      answer = data.candidates[0].content.parts[0].text.trim();

      // Clean up response
      if (answer.startsWith("```")) {
        answer = answer.replace(/^```[a-z]*|```$/g, "").trim();
      }

      // Ensure response is helpful and relevant
      if (answer.length < 10) {
        answer =
          "I'd be happy to help you with that! Could you please provide more details about what you'd like to know about the GLEAS admin system?";
      }
    } else {
      console.error(
        "Gemini API response structure:",
        JSON.stringify(data, null, 2)
      );
      answer =
        "I apologize, but I'm having trouble processing your request right now. Please try rephrasing your question or contact support if the issue persists.";
    }

    res.json({
      answer,
      context: currentPath,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Alreria error:", err);
    res.status(500).json({
      error: "Failed to get response from Alreria",
      details: err.message,
    });
  }
});

// Add security question generation endpoint
router.post("/generate-simple-security-question", async (req, res) => {
  try {
    // Simple math questions for security check
    const questions = [
      {
        questionText: "What is 2 + 2?",
        choices: ["3", "4", "5", "6"],
        correctAnswer: "4",
      },
      {
        questionText: "What is 5 × 3?",
        choices: ["12", "13", "14", "15"],
        correctAnswer: "15",
      },
      {
        questionText: "What is 10 - 4?",
        choices: ["4", "5", "6", "7"],
        correctAnswer: "6",
      },
      {
        questionText: "What is 8 ÷ 2?",
        choices: ["2", "3", "4", "5"],
        correctAnswer: "4",
      },
      {
        questionText: "What is 3 + 7?",
        choices: ["8", "9", "10", "11"],
        correctAnswer: "10",
      },
    ];

    // Randomly select one question
    const randomQuestion =
      questions[Math.floor(Math.random() * questions.length)];

    res.json(randomQuestion);
  } catch (error) {
    console.error("Error generating security question:", error);
    res.status(500).json({ error: "Failed to generate security question" });
  }
});

// Add direct chat AI question generation endpoint
router.post("/generate-questions-chat", generateQuestionsChat);

module.exports = router;
