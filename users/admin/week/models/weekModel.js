const mongoose = require("mongoose");

const weekScheduleSchema = new mongoose.Schema({
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: [true, "Subject is required"]
  },
  questionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
    required: true
  }],
  isActive: {
    type: Boolean,
    default: false
  },
  weekNumber: {
    type: Number,
    required: [true, "Week number is required"],
    min: [1, "Week number must be at least 1"],
    max: [52, "Week number cannot exceed 52"]
  },
  year: {
    type: Number,
    required: [true, "Year is required"],
    default: () => new Date().getFullYear()
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for populated subject
weekScheduleSchema.virtual('subject', {
  ref: 'Subject',
  localField: 'subjectId',
  foreignField: '_id',
  justOne: true
});

// Add virtual for populated questions
weekScheduleSchema.virtual('questions', {
  ref: 'Question',
  localField: 'questionIds',
  foreignField: '_id'
});

// Add compound index for week and year
weekScheduleSchema.index({ weekNumber: 1, year: 1 }, { unique: true });

// Add index for active status
weekScheduleSchema.index({ isActive: 1 });

module.exports = mongoose.model("WeekSchedule", weekScheduleSchema); 