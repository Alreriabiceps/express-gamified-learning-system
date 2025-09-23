const mongoose = require("mongoose");

const userWeeklyAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    weekId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WeekSchedule",
      required: true,
    },
    mode: { type: String, enum: ["solo", "party"], required: true },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamWeeklyAttempt",
    },
    score: { type: Number, default: 0 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

userWeeklyAttemptSchema.index({ userId: 1, weekId: 1 }, { unique: true });

module.exports = mongoose.model("UserWeeklyAttempt", userWeeklyAttemptSchema);




