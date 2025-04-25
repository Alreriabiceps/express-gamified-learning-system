const Question = require("../models/questionModels");
const Subject = require("../../subject/models/subjectModel"); // Correct import path for Subject model

// Function to create questions
const createQuestions = async (req, res) => {
  try {
    const { subjectId, questions } = req.body;

    // Validate subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // Create questions and save them
    const createdQuestions = await Question.insertMany(
      questions.map((question) => ({
        subject: subjectId,
        questionText: question.questionText,
        choices: question.choices,
        correctAnswer: question.correctAnswer
      }))
    );

    res.status(201).json({
      message: "Questions created successfully",
      data: createdQuestions,
    });
  } catch (error) {
    console.error("Error creating questions:", error);
    res.status(500).json({ message: "Error creating questions", error: error.message });
  }
};

// Function to get questions by subject
const getQuestionsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    // Validate subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const questions = await Question.find({ subject: subjectId })
      .populate("subject", "subject")
      .sort({ createdAt: -1 });

    // Always return an array, even if empty
    res.status(200).json(questions || []);
  } catch (error) {
    console.error("Error fetching questions by subject:", error);
    res.status(500).json({ message: "Error fetching questions", error: error.message });
  }
};

// Function to edit a question
const editQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { questionText, choices, correctAnswer } = req.body;

    const updatedQuestion = await Question.findByIdAndUpdate(
      questionId,
      { questionText, choices, correctAnswer },
      { new: true, runValidators: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.status(200).json({
      message: "Question updated successfully",
      data: updatedQuestion,
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ message: "Error updating question", error: error.message });
  }
};

// Function to delete a question
const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const deletedQuestion = await Question.findByIdAndDelete(questionId);

    if (!deletedQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ message: "Error deleting question", error: error.message });
  }
};

module.exports = {
  createQuestions,
  getQuestionsBySubject,
  editQuestion,
  deleteQuestion,
};
