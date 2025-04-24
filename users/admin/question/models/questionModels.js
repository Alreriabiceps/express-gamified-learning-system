const mongoose = require("mongoose");

// Choice schema to define the choices for each question
const choiceSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
});

// Validator to ensure exactly 4 choices per question
const arrayLimit = (val) => val.length === 4;

// Question schema
const questionSchema = new mongoose.Schema({
  subject: {
    // Changed from subjectId to subject for consistency
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject", // Assuming you have a Subject model
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  choices: {
    type: [choiceSchema],
    validate: [arrayLimit, "Each question must have exactly 4 choices"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Question", questionSchema);
