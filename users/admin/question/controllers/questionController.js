const Question = require("../models/questionModels");
const Subject = require("../../subject/models/subjectModel"); // Correct import path for Subject model
const fs = require('fs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
// You may need to install a pptx parser or use a placeholder for now
// const pptxParser = require('pptx-parser');
const fetch = require('node-fetch');
const { execFile } = require('child_process');
const path = require('path');
const textract = require('textract');

// Function to create questions
const createQuestions = async (req, res) => {
  try {
    const { subjectId, questions } = req.body;

    // Validate subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // Create questions and save them
    const createdQuestions = await Question.insertMany(
      questions.map((question) => ({
        subject: subjectId,
        questionText: question.questionText,
        choices: question.choices,
        correctAnswer: question.correctAnswer,
        bloomsLevel: question.bloomsLevel
      }))
    );

    res.status(201).json({
      message: "Questions created successfully",
      data: createdQuestions,
    });
  } catch (error) {
    console.error("Error creating questions:", error);
    res.status(500).json({ message: "Error creating questions", error: error.message });
  }
};

// Function to get questions by subject
const getQuestionsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    // Validate subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const questions = await Question.find({ subject: subjectId })
      .populate("subject", "subject")
      .sort({ createdAt: -1 });

    // Always return an array, even if empty
    res.status(200).json(questions || []);
  } catch (error) {
    console.error("Error fetching questions by subject:", error);
    res.status(500).json({ message: "Error fetching questions", error: error.message });
  }
};

// Function to edit a question
const editQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { questionText, choices, correctAnswer } = req.body;

    const updatedQuestion = await Question.findByIdAndUpdate(
      questionId,
      { questionText, choices, correctAnswer },
      { new: true, runValidators: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.status(200).json({
      message: "Question updated successfully",
      data: updatedQuestion,
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ message: "Error updating question", error: error.message });
  }
};

// Function to delete a question
const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const deletedQuestion = await Question.findByIdAndDelete(questionId);

    if (!deletedQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ message: "Error deleting question", error: error.message });
  }
};

// Function to handle file upload and AI question generation
const generateQuestionsFromFile = async (req, res) => {
  try {
    const { subjectId, bloomsLevel, numQuestions, customPrompt } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    let text = '';
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.mimetype === 'application/pdf') {
      // DOCX or PDF using textract
      console.log('Textract: extracting', file.path);
      text = await new Promise((resolve, reject) => {
        textract.fromFileWithPath(file.path, (error, extractedText) => {
          if (error) {
            console.error('Textract extraction failed:', error);
            return resolve('[Textract extraction failed]');
          }
          resolve(extractedText);
        });
      });
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      // PPTX extraction using Python script
      const pythonScript = path.join(__dirname, '../../../../extract_pptx_text.py');
      const pythonPath = 'D:/python.exe';
      const env = { ...process.env, PYTHONPATH: 'D:/Lib/site-packages' };
      text = await new Promise((resolve, reject) => {
        execFile(pythonPath, [pythonScript, file.path], { env }, (error, stdout, stderr) => {
          if (error) {
            console.error('Python PPTX extraction error:', error, stderr);
            return resolve('[PPTX extraction failed]');
          }
          try {
            const result = JSON.parse(stdout);
            resolve(result.text);
          } catch (e) {
            console.error('Failed to parse PPTX extraction output:', e, stdout);
            resolve('[PPTX extraction failed]');
          }
        });
      });
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Clean up uploaded file
    fs.unlink(file.path, () => {});

    // Trim to 3000 chars
    text = text.slice(0, 3000);

    // Google Gemini API call
    const n = Math.max(1, Math.min(10, Number(numQuestions) || 2));

    // Chunking logic for large files
    const CHUNK_SIZE = 15000;
    const textChunks = [];
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      textChunks.push(text.slice(i, i + CHUNK_SIZE));
    }

    let allQuestions = [];
    for (const chunk of textChunks) {
      let prompt = `Given the following text, generate ${n} high-quality multiple-choice questions at the "${bloomsLevel}" level of Bloom's taxonomy for the subject with ID "${subjectId}". Each question must have 4 plausible choices (one correct, three distractors), and indicate the correct answer. Respond ONLY with a valid JSON array of question objects, and nothing else. Do not include any explanation, markdown, or extra text.\n[\n  {\n    \"questionText\": \"...\",\n    \"choices\": [\"...\", \"...\", \"...\", \"...\"],\n    \"correctAnswer\": \"...\",\n    \"bloomsLevel\": \"...\"\n  },\n  ...\n]\n`;
      if (customPrompt) {
        prompt += `\nAdditional instructions: ${customPrompt}`;
      }
      prompt += `\nText:\n${chunk}`;

      const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const geminiData = await geminiRes.json();
      try {
        if (
          geminiData &&
          geminiData.candidates &&
          geminiData.candidates[0] &&
          geminiData.candidates[0].content &&
          geminiData.candidates[0].content.parts &&
          geminiData.candidates[0].content.parts[0].text
        ) {
          let content = geminiData.candidates[0].content.parts[0].text.trim();
          // Remove markdown code block if present
          if (content.startsWith('```json')) {
            content = content.replace(/^```json|```$/g, '').trim();
          } else if (content.startsWith('```')) {
            content = content.replace(/^```|```$/g, '').trim();
          }
          // Try to extract array from within text (ignore any text before/after the array)
          const match = content.match(/\[.*\]/s);
          let questions = [];
          if (match) {
            try {
              questions = JSON.parse(match[0]);
            } catch (e) {
              questions = [{ questionText: content, choices: [], correctAnswer: '', bloomsLevel }];
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
                questions = [{ questionText: content, choices: [], correctAnswer: '', bloomsLevel }];
              }
            }
          }
          // Ensure always an array
          if (!Array.isArray(questions)) {
            questions = [questions];
          }
          allQuestions = allQuestions.concat(questions);
        } else {
          // Fallback: log the response for debugging
          console.error('Gemini response missing expected fields:', geminiData);
          allQuestions.push({ questionText: 'AI did not return a valid response', choices: [], correctAnswer: '', bloomsLevel });
        }
      } catch (e) {
        allQuestions.push({ questionText: geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'AI error', choices: [], correctAnswer: '', bloomsLevel });
      }
    }

    res.json({ extractedText: text.slice(0, 15000), questions: allQuestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process file and generate questions' });
  }
};

module.exports = {
  createQuestions,
  getQuestionsBySubject,
  editQuestion,
  deleteQuestion,
  generateQuestionsFromFile,
};
