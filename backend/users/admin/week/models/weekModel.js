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
  },
  startDate: {
    type: Date,
    required: false
  },
  endDate: {
    type: Date,
    required: false
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

// Drop all existing indexes first
weekScheduleSchema.indexes().forEach(index => {
  weekScheduleSchema.index(index[0], { ...index[1], unique: false });
});

// Add compound index for week, year, and subject to ensure uniqueness per subject
weekScheduleSchema.index({ weekNumber: 1, year: 1, subjectId: 1 }, { unique: true });

// Add index for active status
weekScheduleSchema.index({ isActive: 1 });

// Pre-save middleware to calculate dates based on week number and year
weekScheduleSchema.pre('save', function(next) {
  if (this.weekNumber && this.year) {
    // Calculate the start date of the week
    const startDate = new Date(this.year, 0, 1); // Start with January 1st
    startDate.setDate(startDate.getDate() + (this.weekNumber - 1) * 7);
    this.startDate = startDate;

    // Calculate the end date (start date + 6 days)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    this.endDate = endDate;
  }
  next();
});

// Create the model
const WeekSchedule = mongoose.model("WeekSchedule", weekScheduleSchema);

// Drop the old weekNumber_1_year_1 index if it exists
WeekSchedule.collection.dropIndex('weekNumber_1_year_1').catch(err => {
  if (err.code !== 26) { // 26 is the error code for index not found
    console.error('Error dropping weekNumber_1_year_1 index:', err);
  }
});

module.exports = WeekSchedule; 