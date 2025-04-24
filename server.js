// Load environment variables from .env file
require("dotenv").config();

// Import necessary packages
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Import API route handlers
const studentRoutes = require("./users/admin/student/routes/studentRoutes");
const questionRoutes = require("./users/admin/question/routes/questionRoutes");
const authRoutes = require("./auth/authRoutes");
const subjectRoutes = require("./users/admin/subject/routes/subjectRoutes");
const weekRoutes = require("./users/admin/week/routes/weekRoutes"); // Import the week route

// Create an Express application
const app = express();

// Set the port for the server
const PORT = process.env.PORT || 3000;

// Retrieve MongoDB URI from environment variables
const MONGO_URI = process.env.MONGO_URI;

// Ensure MONGO_URI is defined, otherwise terminate the server
if (!MONGO_URI) {
  console.error("MONGO_URI is not defined in the .env file");
  process.exit(1);
}

// Apply middleware to handle CORS and JSON requests
app.use(
  cors({
    origin: process.env.CLIENT_URL, // Frontend URL for allowing cross-origin requests
    credentials: true, // Allow credentials (cookies, authorization headers)
  })
);
app.use(express.json()); // Parse JSON request bodies

// Connect to MongoDB using Mongoose
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit the process if DB connection fails
  });

// Define API routes
app.use("/api/auth", authRoutes); // Authentication routes
app.use("/api/students", studentRoutes); // Student management routes
app.use("/api/questions", questionRoutes); // Question management routes
app.use("/api/subjects", subjectRoutes); // Subject management routes
app.use("/api/weeks", weekRoutes); // Week schedule management routes

// Root route for testing if the server is running
app.get("/", (req, res) => {
  res.send("Hello from Express server!");
});

// Catch-all route handler for undefined routes (404 error)
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler for unhandled errors
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack); // Log the error stack for debugging
  res.status(500).json({ error: "Internal Server Error" });
});

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
