// controllers/subjectController.js
const Subject = require("../models/subjectModel");

// GET /api/subjects
const getSubjects = async (req, res) => {
  try {
    // Sort by subject name alphabetically for consistent ordering
    const subjects = await Subject.find().sort({ subject: 1 });
    res.status(200).json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch subjects", error: error.message });
  }
};

// POST /api/subjects
const createSubject = async (req, res) => {
  // Destructure 'subject' from the body
  const { subject } = req.body;

  // More robust validation
  if (!subject || typeof subject !== "string" || subject.trim() === "") {
    return res
      .status(400)
      .json({
        message: "Subject name is required and must be a non-empty string",
      });
  }

  try {
    // Create new subject document using the 'subject' field (matching the updated model)
    const newSubject = new Subject({ subject: subject.trim() }); // Ensure trimmed value is saved
    await newSubject.save();
    res.status(201).json(newSubject); // Return the created subject
  } catch (error) {
    console.error("Error creating subject:", error);
    // Handle potential duplicate key error (if unique: true is used)
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Subject already exists", error: error.message });
    }
    res
      .status(500)
      .json({ message: "Failed to create subject", error: error.message });
  }
};

// PUT /api/subjects/:id
const updateSubject = async (req, res) => {
  const { id } = req.params;
  const { subject } = req.body; // Expecting the updated subject name in the body

  // Validation
  if (!subject || typeof subject !== "string" || subject.trim() === "") {
    return res
      .status(400)
      .json({
        message: "Subject name is required and must be a non-empty string",
      });
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid subject ID format" });
  }

  try {
    // Find by ID and update using the 'subject' field
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { subject: subject.trim() }, // Ensure update uses the correct field name and trimmed value
      { new: true, runValidators: true } // Return the updated doc, run schema validators
    );

    if (!updatedSubject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    res.status(200).json(updatedSubject);
  } catch (error) {
    console.error("Error updating subject:", error);
    // Handle potential duplicate key error on update
    if (error.code === 11000) {
      return res
        .status(409)
        .json({
          message: "Another subject with this name already exists",
          error: error.message,
        });
    }
    res
      .status(500)
      .json({ message: "Failed to update subject", error: error.message });
  }
};

// DELETE /api/subjects/:id
const deleteSubject = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid subject ID format" });
  }

  try {
    const deletedSubject = await Subject.findByIdAndDelete(id);

    if (!deletedSubject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    // Send back the ID of the deleted item, useful for frontend confirmation
    res.status(200).json({ message: "Subject deleted successfully", id: id });
  } catch (error) {
    console.error("Error deleting subject:", error);
    res
      .status(500)
      .json({ message: "Failed to delete subject", error: error.message });
  }
};

// Need to import mongoose to check ObjectId validity in update/delete
const mongoose = require("mongoose");

module.exports = {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
};
