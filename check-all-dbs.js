const mongoose = require("mongoose");

async function checkAllDatabases() {
  const possibleDatabases = [
    "gamified-learning",
    "gamified_learning",
    "agila",
    "agila-learning",
    "agila_learning",
    "test",
    "development",
    "production",
  ];

  for (const dbName of possibleDatabases) {
    try {
      console.log(`\n=== Checking database: ${dbName} ===`);
      await mongoose.connect(`mongodb://localhost:27017/${dbName}`);

      const collections = await mongoose.connection.db
        .listCollections()
        .toArray();
      console.log(
        `Collections in ${dbName}:`,
        collections.map((c) => c.name)
      );

      // Check for questions in any collection
      for (const collection of collections) {
        if (
          collection.name.toLowerCase().includes("question") ||
          collection.name.toLowerCase().includes("quiz") ||
          collection.name.toLowerCase().includes("test")
        ) {
          const count = await mongoose.connection.db
            .collection(collection.name)
            .countDocuments();
          console.log(`  ${collection.name}: ${count} documents`);

          if (count > 0) {
            const sample = await mongoose.connection.db
              .collection(collection.name)
              .findOne();
            console.log(`    Sample document keys:`, Object.keys(sample));
          }
        }
      }

      await mongoose.disconnect();
    } catch (error) {
      console.log(`Failed to connect to ${dbName}: ${error.message}`);
    }
  }
}

checkAllDatabases();
