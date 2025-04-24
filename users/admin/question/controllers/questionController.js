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
        subject: subjectId, // Make sure 'subject' field is being populated
        questionText: question.questionText,
        choices: question.choices,
      }))
    );

    res.status(201).json({
      message: "Questions created successfully",
      data: createdQuestions,
    });
  } catch (error) {
    console.error("Error creating questions:", error);
    res.status(500).json({ message: "Error creating questions", error });
  }
};

// Function to get questions by subject
const getQuestionsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    // Find questions based on subjectId
    const questions = await Question.find({ subject: subjectId }) // `subject` matches the field name in your Question schema
      .populate("subject", "name"); // Populate subject field (optional)

    if (!questions.length) {
      return res
        .status(404)
        .json({ message: "No questions found for this subject" });
    }

    res.status(200).json(questions);
  } catch (error) {
    console.error("Error fetching questions by subject:", error);
    res.status(500).json({ message: "Error fetching questions", error });
  }
};

// Function to edit a question
// Function to edit a question
const editQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { questionText, choices } = req.body;

    const updatedQuestion = await Question.findByIdAndUpdate(
      questionId,
      { questionText, choices },
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
    res.status(500).json({ message: "Error updating question", error });
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
    res.status(500).json({ message: "Error deleting question", error });
  }
};

module.exports = {
  createQuestions,
  getQuestionsBySubject,
  editQuestion,
  deleteQuestion,
};
