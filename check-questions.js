const mongoose = require("mongoose");

async function checkQuestions() {
  try {
    await mongoose.connect("mongodb://localhost:27017/gamified_learning");
    console.log("Connected to gamified_learning database");

    const questionsCollection = mongoose.connection.db.collection("questions");

    // Get total count
    const totalCount = await questionsCollection.countDocuments();
    console.log(`Total documents in questions collection: ${totalCount}`);

    // Get count with different filters
    const withQuestionText = await questionsCollection.countDocuments({
      questionText: { $exists: true },
    });
    console.log(`Documents with questionText: ${withQuestionText}`);

    const withQuestion = await questionsCollection.countDocuments({
      question: { $exists: true },
    });
    console.log(`Documents with question: ${withQuestion}`);

    // Get a sample document
    const sample = await questionsCollection.findOne();
    if (sample) {
      console.log("Sample document:", JSON.stringify(sample, null, 2));
    } else {
      console.log("No documents found in questions collection");
    }

    // Check all collections for any documents
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    for (const collection of collections) {
      const count = await mongoose.connection.db
        .collection(collection.name)
        .countDocuments();
      if (count > 0) {
        console.log(`${collection.name}: ${count} documents`);
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkQuestions();
