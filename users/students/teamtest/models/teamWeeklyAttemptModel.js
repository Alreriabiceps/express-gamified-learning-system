const mongoose = require("mongoose");

const teamWeeklyAttemptSchema = new mongoose.Schema(
  {
    weekId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WeekSchedule",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    },
    partyId: {
      type: String,
    },
    roster: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
      },
    ],
    currentIndex: {
      type: Number,
      default: 0,
    },
    turnIndex: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
    },
    questions: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
        selected: { type: String },
        correctAnswer: { type: String },
        isCorrect: { type: Boolean },
      },
    ],
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeamWeeklyAttempt", teamWeeklyAttemptSchema);


