// weeklytestController.js
const WeeklyTest = require('../models/weeklyTestModel'); // adjust path accordingly

// Fetch questions based on subject and week
exports.getQuestionsByWeek = async (req, res) => {
  try {
    const { subject, week } = req.params;
    const filter = {};

    // If a subject is provided, filter by subject
    if (subject && subject !== "All Subjects") {
      filter.strand = subject;
    }

    // If a week is provided, filter by week
    if (week && week !== "All Weeks") {
      filter.week = week;
    }

    const questions = await WeeklyTest.find(filter);

    if (questions.length === 0) {
      return res.status(404).json({ error: 'No questions found for this subject and week' });
    }

    res.status(200).json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};
