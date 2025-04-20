const WeekQuestion = require('../models/questionModels');

const createQuestions = async (req, res) => {
  try {
    const { subject, week, questions } = req.body;

    // Log the incoming request to inspect the data
    console.log('Request body:', req.body);

    // Validation for missing fields
    if (!subject || !week || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Subject, week, and questions are required.' });
    }

    // Check if the same set of questions already exists for the given subject and week
    const existing = await WeekQuestion.findOne({ subject, week });
    if (existing) {
      return res.status(400).json({ error: `Questions for ${subject} in week ${week} already exist.` });
    }

    // Save new questions set
    const newSet = new WeekQuestion({ subject, week, questions });
    await newSet.save();

    // Return success message with the created data
    res.status(201).json({ message: 'Questions saved successfully.', data: newSet });
  } catch (err) {
    console.error('Error creating questions:', err); // Log the entire error
    res.status(500).json({ error: 'Internal Server Error. Could not save questions.' });
  }
};

const getQuestionsBySubjectAndWeek = async (req, res) => {
  try {
    const { subject, week } = req.params;

    // Find the questions for the specific subject and week
    const found = await WeekQuestion.findOne({ subject, week }).select('questions');

    // If no questions found, return a 404 error
    if (!found) {
      return res.status(404).json({ error: `No questions found for ${subject} in week ${week}.` });
    }

    // Return the questions data
    res.status(200).json({ questions: found.questions });
  } catch (err) {
    console.error('Error fetching questions:', err); // Log the entire error
    res.status(500).json({ error: 'Internal Server Error. Could not fetch questions.' });
  }
};

module.exports = {
  createQuestions,
  getQuestionsBySubjectAndWeek
};
