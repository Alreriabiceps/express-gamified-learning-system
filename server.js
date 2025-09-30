console.log("server.js loaded");
// Load environment variables from .env file
const path = require("path");
const dotenv = require("dotenv");

// Try to load .env from multiple possible locations
const envPaths = [
  path.join(__dirname, ".env"), // backend/.env
  path.join(__dirname, "..", ".env"), // project root .env
];

let envLoaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`✅ .env file loaded from: ${envPath}`);
    console.log("MONGO_URI loaded:", process.env.MONGO_URI ? "Yes" : "No");
    console.log("MONGO_URI value:", process.env.MONGO_URI);
    console.log(
      "All env vars:",
      Object.keys(process.env).filter((key) => key.startsWith("MONGO"))
    );
    envLoaded = true;
    break;
  } else {
    console.log(`❌ Failed to load .env from: ${envPath}`);
    console.log("Error:", result.error.message);
  }
}

if (!envLoaded) {
  console.error("❌ Could not load .env file from any location");
  console.log("Tried paths:", envPaths);
}

// Temporary fix: manually set MONGO_URI if not loaded
if (!process.env.MONGO_URI) {
  console.log("🔧 Manually setting MONGO_URI...");
  process.env.MONGO_URI =
    "mongodb+srv://raslforstudying:BFhzqmMqvpgXHNxS@gleas.k5xwusc.mongodb.net/?retryWrites=true&w=majority&appName=gleas";
  console.log("✅ MONGO_URI manually set");
}

// Import necessary packages
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");

// Import configurations
const config = require("./config/config");
const corsConfig = require("./config/cors");
const jwtConfig = require("./config/jwt");
const connectDB = require("./config/db");
const socketService = require("./services/socketService");

// Import main routes
const mainRoutes = require("./core/routes");
const dashboardRoutes = require("./users/students/dashboard/routes/dashboardRoutes");

// Import new modular routes
const moduleRoutes = require("./modules/index");

// Import messageController for status updates
const messageController = require("./users/students/chats/controllers/messageController");

// Import GameServer
const GameServer = require("./socket/gameServer");

// Import message cleanup service
const { startMessageCleanup } = require("./services/messageCleanup");

// Create an Express application
const app = express();
const server = http.createServer(app);

// Initialize socket server
const gameServer = new GameServer(server);

// Initialize socketService with the io instance
socketService.initializeSocket(gameServer.io);

// Initialize match queue service
const matchQueue = require("./services/matchQueue");
const Student = require("./users/admin/student/models/studentModels");
matchQueue.initializeSocket(socketService);
matchQueue.initializeStudentModel(Student);

// Attach io to the app for controller access
app.set("io", gameServer.io);
app.set("gameServer", gameServer);

// Set the port for the server
const PORT = config.server.port;

// Connect to MongoDB using Mongoose
connectDB();

// Apply middleware to handle CORS and JSON requests
app.use(cors(corsConfig));
app.use(express.json());

// Add detailed request logging middleware
app.use((req, res, next) => {
  console.log("\n=== New Request ===");
  console.log("Time:", new Date().toISOString());
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("Query:", req.query);
  console.log("Params:", req.params);
  console.log("==================\n");
  next();
});

// Define API routes with logging
app.use(
  config.api.prefix,
  (req, res, next) => {
    console.log(`API Route accessed: ${req.method} ${req.url}`);
    next();
  },
  mainRoutes
);

// Add modular routes under /api/modules (for new structure)
app.use(
  `${config.api.prefix}/modules`,
  (req, res, next) => {
    console.log(`Module Route accessed: ${req.method} ${req.url}`);
    next();
  },
  moduleRoutes
);

// Add dashboard routes under /api/dashboard
app.use(
  `${config.api.prefix}/dashboard`,
  (req, res, next) => {
    console.log(`Dashboard Route accessed: ${req.method} ${req.url}`);
    next();
  },
  dashboardRoutes
);

// Admin Routes
app.use(
  "/api/admin/reviewers",
  require("./users/admin/reviewer/routes/reviewerRoutes")
);

// Add route logging middleware after routes are defined
app.use((req, res, next) => {
  console.log("Route not found:", req.method, req.url);
  next();
});

// Root route for testing if the server is running
app.get("/", (req, res) => {
  res.send("Hello from Express server!");
});

// Catch-all route handler for undefined routes (404 error)
app.use((req, res) => {
  console.log("404 - Route not found:", req.method, req.url);
  res.status(404).json({ error: "Route not found" });
});

// Global error handler for unhandled errors
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start the server
server.listen(PORT, () => {
  console.log(`\n=== Server Started ===`);
  console.log(`Server is running on port ${PORT}`);
  console.log(`API base URL: http://localhost:${PORT}${config.api.prefix}`);
  console.log("Allowed CORS origins:", config.clientUrls);
  console.log("=====================\n");

  // Start message cleanup scheduler
  startMessageCleanup();
});

module.exports = { gameServer };
