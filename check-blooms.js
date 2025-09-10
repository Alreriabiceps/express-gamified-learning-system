const mongoose = require("mongoose");
const Question = require("./users/admin/question/models/questionModels");

async function checkBlooms() {
  try {
    await mongoose.connect(
      "mongodb+srv://gleas:k5xwusc@gleas.k5xwusc.mongodb.net/test?retryWrites=true&w=majority"
    );
    console.log("Connected to database");

    // Get all unique Bloom's levels
    const bloomLevels = await Question.distinct("bloomsLevel");
    console.log("Unique Bloom's levels in database:", bloomLevels);

    // Get sample questions for each level
    for (const level of bloomLevels) {
      const sample = await Question.findOne({ bloomsLevel: level });
      console.log(`\nSample ${level} question:`, {
        questionText: sample.questionText?.substring(0, 100) + "...",
        bloomsLevel: sample.bloomsLevel,
        choices: sample.choices,
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkBlooms();
