const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Use the correct database URL where the questions are stored
    // You need to set MONGO_URI environment variable with your MongoDB Atlas connection string
    // Example: mongodb+srv://username:password@gleas.k5xwusc.mongodb.net/test?retryWrites=true&w=majority
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb+srv://gleas:k5xwusc@gleas.k5xwusc.mongodb.net/test?retryWrites=true&w=majority";

    console.log("Attempting to connect to MongoDB...");
    console.log("MongoDB URI:", mongoUri.replace(/\/\/.*@/, "//***:***@")); // Hide credentials in logs

    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`MongoDB Database: ${conn.connection.name}`);

    // Add connection event listeners
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected");
    });
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.error("Full error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
