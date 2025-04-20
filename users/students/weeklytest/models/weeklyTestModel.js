const mongoose = require('mongoose');

const weeklyTestSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  choices: {
    type: [String],
    required: true
  },
  correctAnswer: {
    type: String,
    required: true
  },
  week: {
    type: Number,
    required: true
  },
  strand: {
    type: String, // optional: filter by ABM, STEM, etc.
    required: false
  },
}, { timestamps: true });

// Specify custom collection name 'weekquestions'
module.exports = mongoose.model('WeeklyTest', weeklyTestSchema, 'weekquestions');
