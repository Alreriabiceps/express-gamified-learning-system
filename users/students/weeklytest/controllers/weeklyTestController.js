// weeklytestController.js
const WeeklyTest = require('../models/weeklyTestModel'); // Adjust the path as needed

exports.getQuestionsByWeek = async (req, res) => {
  try {
    const { subject, week } = req.params;
    const filter = {};

    // If a subject is provided, filter by subject
    if (subject && subject !== "All Subjects") {
      filter.strand = subject;
    }

    // If a week is provided, filter by week, and make sure it's a number
    if (week && week !== "All Weeks") {
      const weekNumber = parseInt(week, 10); // Convert to a number
      if (isNaN(weekNumber)) {
        return res.status(400).json({ error: 'Invalid week parameter' });
      }
      filter.week = weekNumber;
    }

    const test = await WeeklyTest.findOne(filter);

    if (!test) {
      return res.status(404).json({ error: 'No questions found for this subject and week' });
    }

    res.status(200).json({ test });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};
