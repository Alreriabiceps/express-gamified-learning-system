const mongoose = require("mongoose");
const Question = require("./users/admin/question/models/questionModels");

async function testDB() {
  try {
    await mongoose.connect("mongodb://localhost:27017/gamified-learning");
    console.log("Connected to database");

    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      "Collections:",
      collections.map((c) => c.name)
    );

    const count = await Question.countDocuments();
    console.log("Question count:", count);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testDB();
