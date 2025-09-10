const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Use the correct database URL where the questions are stored
    // You need to set MONGO_URI environment variable with your MongoDB Atlas connection string
    // Example: mongodb+srv://username:password@gleas.k5xwusc.mongodb.net/test?retryWrites=true&w=majority
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb+srv://gleas:k5xwusc@gleas.k5xwusc.mongodb.net/test?retryWrites=true&w=majority";

    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`MongoDB Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
