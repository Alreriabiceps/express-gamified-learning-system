const mongoose = require("mongoose");
const Question = require("./users/admin/question/models/questionModels");

async function testCorrectDatabase() {
  try {
    // Connect to the correct database where the questions are
    await mongoose.connect("mongodb://localhost:27017/test");
    console.log("Connected to test database");

    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      "Collections in test database:",
      collections.map((c) => c.name)
    );

    const questionCount = await Question.countDocuments();
    console.log("Question count in test database:", questionCount);

    if (questionCount > 0) {
      const sampleQuestion = await Question.findOne();
      console.log("Sample question:", {
        id: sampleQuestion._id,
        questionText: sampleQuestion.questionText?.substring(0, 50) + "...",
        bloomsLevel: sampleQuestion.bloomsLevel,
        choices: sampleQuestion.choices?.length || 0,
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testCorrectDatabase();
