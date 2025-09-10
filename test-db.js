const mongoose = require("mongoose");
const Question = require("./users/admin/question/models/questionModels");

async function testDatabase() {
  try {
    // Connect to database - try different possible database names
    const possibleDatabases = [
      "mongodb://localhost:27017/gamified-learning",
      "mongodb://localhost:27017/gamified_learning",
      "mongodb://localhost:27017/agila",
      "mongodb://localhost:27017/agila-learning",
      "mongodb://localhost:27017/agila_learning",
    ];

    let connected = false;
    for (const dbUrl of possibleDatabases) {
      try {
        console.log(`Trying to connect to: ${dbUrl}`);
        await mongoose.connect(dbUrl, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        connected = true;
        console.log(`Successfully connected to: ${dbUrl}`);
        break;
      } catch (error) {
        console.log(`Failed to connect to ${dbUrl}: ${error.message}`);
        if (mongoose.connection.readyState === 1) {
          await mongoose.disconnect();
        }
      }
    }

    if (!connected) {
      throw new Error("Could not connect to any database");
    }

    console.log("Connected to database");

    // List all collections in the database
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      "Available collections:",
      collections.map((c) => c.name)
    );

    // Count questions
    const questionCount = await Question.countDocuments();
    console.log("Total questions in database:", questionCount);

    // Get a sample question
    const sampleQuestion = await Question.findOne();
    if (sampleQuestion) {
      console.log("Sample question:", {
        id: sampleQuestion._id,
        questionText: sampleQuestion.questionText?.substring(0, 50) + "...",
        bloomsLevel: sampleQuestion.bloomsLevel,
        choices: sampleQuestion.choices?.length || 0,
      });
    } else {
      console.log("No questions found in database");

      // Try to find questions in other collections
      for (const collection of collections) {
        if (collection.name.toLowerCase().includes("question")) {
          console.log(`Checking collection: ${collection.name}`);
          const collectionData = await mongoose.connection.db
            .collection(collection.name)
            .findOne();
          if (collectionData) {
            console.log(`Found data in ${collection.name}:`, {
              id: collectionData._id,
              keys: Object.keys(collectionData),
            });
          }
        }
      }
    }

    await mongoose.disconnect();
    console.log("Disconnected from database");
  } catch (error) {
    console.error("Database error:", error.message);
  }
}

testDatabase();
