const mongoose = require("mongoose");

// Question schema
const questionSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  choices: {
    type: [String],
    validate: {
      validator: function(val) {
        return val.length === 4;
      },
      message: "Each question must have exactly 4 choices"
    },
    required: true,
  },
  correctAnswer: {
    type: String,
    required: true,
    validate: {
      validator: function(val) {
        return this.choices.includes(val);
      },
      message: "Correct answer must be one of the choices"
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add index for faster queries
questionSchema.index({ subject: 1 });

module.exports = mongoose.model("Question", questionSchema);
