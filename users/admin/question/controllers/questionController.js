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
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // DOCX
      const result = await mammoth.extractRawText({ path: file.path });
      text = result.value;
    } else if (file.mimetype === 'application/pdf') {
      // PDF
      const dataBuffer = fs.readFileSync(file.path);
      const data = await pdfParse(dataBuffer);
      text = data.text;
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

    // Call OpenRouter (mistralai/mistral-medium) to generate questions
    const n = Math.max(1, Math.min(10, Number(numQuestions) || 2));
    let prompt = `Given the following text, generate ${n} high-quality multiple-choice questions at the \"${bloomsLevel}\" level of Bloom's taxonomy for the subject with ID \"${subjectId}\". Each question must have 4 plausible choices (one correct, three distractors), and indicate the correct answer. Respond ONLY with a valid JSON array of question objects, and nothing else. Do not include any explanation, markdown, or extra text.\n[\n  {\n    \"questionText\": \"...\",\n    \"choices\": [\"...\", \"...\", \"...\", \"...\"],\n    \"correctAnswer\": \"...\",\n    \"bloomsLevel\": \"...\"\n  },\n  ...\n]\n`;
    if (customPrompt) {
      prompt += `\nAdditional instructions: ${customPrompt}`;
    }
    prompt += `\nText:\n${text}`;

    // Replace with your OpenRouter API key
    const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-medium',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800
      })
    });
    const openrouterData = await openrouterRes.json();
    let questions = [];
    try {
      if (
        openrouterData &&
        openrouterData.choices &&
        openrouterData.choices[0] &&
        openrouterData.choices[0].message &&
        openrouterData.choices[0].message.content
      ) {
        let content = openrouterData.choices[0].message.content.trim();

        // Log the raw AI output for debugging
        console.log('AI raw output:', content);

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
      } else {
        // Fallback: log the response for debugging
        console.error('OpenRouter response missing expected fields:', openrouterData);
        questions = [{ questionText: 'AI did not return a valid response', choices: [], correctAnswer: '', bloomsLevel }];
      }
    } catch (e) {
      questions = [{ questionText: openrouterData.choices?.[0]?.message?.content || 'AI error', choices: [], correctAnswer: '', bloomsLevel }];
    }

    res.json({ extractedText: text, questions });
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
