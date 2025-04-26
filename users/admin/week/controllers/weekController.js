const WeekSchedule = require("../models/weekModel");
const Subject = require("../../subject/models/subjectModel");
const Question = require("../../question/models/questionModels");

// Get all week schedules
const getAllWeekSchedules = async (req, res) => {
  try {
    const schedules = await WeekSchedule.find()
      .populate('subjectId', 'subject')
      .populate('questionIds', 'questionText choices correctAnswer')
      .sort({ year: -1, weekNumber: -1 });
    res.status(200).json(schedules);
  } catch (error) {
    console.error("Error fetching week schedules:", error);
    res.status(500).json({ message: "Error fetching schedules", error: error.message });
  }
};

// Get active week schedules
const getActiveWeekSchedules = async (req, res) => {
  try {
    const schedules = await WeekSchedule.find({ isActive: true })
      .populate('subjectId', 'subject')
      .populate('questionIds', 'questionText choices correctAnswer')
      .sort({ year: -1, weekNumber: -1 });
    res.status(200).json(schedules);
  } catch (error) {
    console.error("Error fetching active schedules:", error);
    res.status(500).json({ message: "Error fetching active schedules", error: error.message });
  }
};

// Create a new week schedule
const createWeekSchedule = async (req, res) => {
  try {
    const { subject, questions, weekNumber, year } = req.body;
    console.log('Creating schedule with data:', { subject, questions, weekNumber, year });

    // Validate subject exists
    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      console.log('Subject not found:', subject);
      return res.status(404).json({ message: "Subject not found" });
    }

    // Validate questions exist
    const questionDocs = await Question.find({ _id: { $in: questions } });
    if (questionDocs.length !== questions.length) {
      console.log('Questions not found:', { requested: questions.length, found: questionDocs.length });
      return res.status(404).json({ message: "One or more questions not found" });
    }

    // Check if a schedule already exists for this week and year
    const existingSchedule = await WeekSchedule.findOne({
      weekNumber,
      year,
      subjectId: subjectDoc._id
    });
    if (existingSchedule) {
      console.log('Schedule already exists:', existingSchedule);
      return res.status(409).json({ message: "A schedule already exists for this subject in this week" });
    }

    const newSchedule = new WeekSchedule({
      subjectId: subjectDoc._id,
      questionIds: questions,
      weekNumber,
      year: year || new Date().getFullYear()
    });

    console.log('Saving new schedule:', newSchedule);
    try {
      await newSchedule.save();
      console.log('Schedule saved successfully');
    } catch (saveError) {
      console.error('Error saving schedule:', saveError);
      console.error('Save error details:', {
        name: saveError.name,
        code: saveError.code,
        keyPattern: saveError.keyPattern,
        keyValue: saveError.keyValue
      });
      throw saveError;
    }

    // Populate the response
    const populatedSchedule = await WeekSchedule.findById(newSchedule._id)
      .populate('subjectId', 'subject')
      .populate('questionIds', 'questionText choices correctAnswer');

    console.log('Schedule created successfully:', populatedSchedule);
    res.status(201).json(populatedSchedule);
  } catch (error) {
    console.error("Error creating week schedule:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      name: error.name,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    res.status(500).json({
      message: "Error creating schedule",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue
      } : undefined
    });
  }
};

// Get a week schedule by date
const getWeekScheduleByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const schedule = await WeekSchedule.findOne({ date })
      .populate('subjectId', 'subject')
      .populate('questionIds', 'questionText choices');

    if (!schedule) {
      return res.status(404).json({ message: "No schedule found for this date" });
    }

    res.json(schedule);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    res.status(500).json({ message: "Error fetching schedule", error: error.message });
  }
};

// Update a week schedule
const updateWeekSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, questions, weekNumber, year } = req.body;

    // Validate subject exists
    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // Validate questions exist
    const questionDocs = await Question.find({ _id: { $in: questions } });
    if (questionDocs.length !== questions.length) {
      return res.status(404).json({ message: "One or more questions not found" });
    }

    // Check if another schedule exists for this week and year
    const existingSchedule = await WeekSchedule.findOne({
      weekNumber,
      year,
      subjectId: subjectDoc._id,
      _id: { $ne: id }
    });
    if (existingSchedule) {
      return res.status(409).json({ message: "Another schedule already exists for this subject in this week" });
    }

    const updatedSchedule = await WeekSchedule.findByIdAndUpdate(
      id,
      {
        subjectId: subjectDoc._id,
        questionIds: questions,
        weekNumber,
        year
      },
      { new: true, runValidators: true }
    ).populate('subjectId', 'subject')
      .populate('questionIds', 'questionText choices correctAnswer');

    if (!updatedSchedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.json(updatedSchedule);
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ message: "Error updating schedule", error: error.message });
  }
};

// Toggle active status
const toggleActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await WeekSchedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // If activating, only deactivate schedules with the same subject
    if (!schedule.isActive) {
      await WeekSchedule.updateMany(
        {
          _id: { $ne: id },
          subjectId: schedule.subjectId,
          weekNumber: schedule.weekNumber,
          year: schedule.year
        },
        { isActive: false }
      );
    }

    schedule.isActive = !schedule.isActive;
    await schedule.save();

    const updatedSchedule = await WeekSchedule.findById(id)
      .populate('subjectId', 'subject')
      .populate('questionIds', 'questionText choices correctAnswer');

    res.json(updatedSchedule);
  } catch (error) {
    console.error("Error toggling active status:", error);
    res.status(500).json({ message: "Error toggling active status", error: error.message });
  }
};

// Delete a week schedule
const deleteWeekSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSchedule = await WeekSchedule.findByIdAndDelete(id);

    if (!deletedSchedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.json({ message: "Schedule deleted successfully", id });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res.status(500).json({ message: "Error deleting schedule", error: error.message });
  }
};

module.exports = {
  getAllWeekSchedules,
  getActiveWeekSchedules,
  createWeekSchedule,
  getWeekScheduleByDate,
  updateWeekSchedule,
  toggleActiveStatus,
  deleteWeekSchedule
}; 