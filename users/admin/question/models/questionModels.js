const mongoose = require('mongoose');

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

// Validator to ensure there are exactly 4 choices
const arrayLimit = (val) => val.length === 4;

// Question schema defining the structure of each question
const questionSchema = new mongoose.Schema({
  questionText: { 
    type: String, 
    required: true,
  },
  choices: { 
    type: [choiceSchema], 
    validate: [arrayLimit, 'Each question must have exactly 4 choices'], 
    required: true, 
  },
  
});

// WeekQuestion schema that ties the questions to a subject and week
const weekQuestionSchema = new mongoose.Schema({
  subject: { 
    type: String, 
    required: true,  
  },
  week: { 
    type: String, 
    required: true,  
  },
  questions: { 
    type: [questionSchema], 
    required: true,  
  },
  createdAt: { 
    type: Date, 
    default: Date.now,  
  },
});

module.exports = mongoose.model('WeekQuestion', weekQuestionSchema);
