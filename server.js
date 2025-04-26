// Load environment variables from .env file
require("dotenv").config();

// Import necessary packages
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Import API route handlers
const studentRoutes = require("./users/admin/student/routes/studentRoutes");
const questionRoutes = require("./users/admin/question/routes/questionRoutes");
const authRoutes = require("./auth/authRoutes");
const subjectRoutes = require("./users/admin/subject/routes/subjectRoutes");
const weekRoutes = require("./users/admin/week/routes/weekRoutes"); // Import the week route
const weeklyTestRoutes = require("./users/students/weeklytest/routes/weeklyTestRoutes"); // Import weekly test routes
const dashboardRoutes = require("./users/admin/dashboard/routes/dashboardRoutes");
const lobbyRoutes = require("./features/lobby/routes/lobbyRoutes"); // Import lobby routes

// Create an Express application
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Set the port for the server
const PORT = 5000;

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
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json()); // Parse JSON request bodies

// Connect to MongoDB using Mongoose
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB Atlas successfully");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit the process if DB connection fails
  });

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Define API routes
app.use("/api/auth", authRoutes); // Authentication routes
app.use("/api/students", studentRoutes); // Student management routes
app.use("/api/questions", questionRoutes); // Question management routes
app.use("/api/subjects", subjectRoutes); // Subject management routes
app.use("/api/weeks", weekRoutes); // Week schedule management routes
app.use("/api/weeklytest", weeklyTestRoutes); // Weekly test routes
app.use("/api/admin/dashboard", dashboardRoutes); // Dashboard routes
app.use("/api/lobbies", lobbyRoutes); // Lobby routes

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

// WebSocket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);

  // Join user's personal room for private messages
  socket.join(socket.userId);

  // Handle duel challenges
  socket.on('challenge_duel', async (data) => {
    const { opponentId } = data;
    // Emit to opponent's room
    io.to(opponentId).emit('duel_challenge', {
      challengerId: socket.userId,
      timestamp: new Date()
    });
  });

  // Handle duel acceptance
  socket.on('accept_duel', async (data) => {
    const { duelId, challengerId } = data;
    // Emit to challenger's room
    io.to(challengerId).emit('duel_accepted', {
      duelId,
      opponentId: socket.userId,
      timestamp: new Date()
    });
  });

  // Handle duel completion
  socket.on('complete_duel', async (data) => {
    const { duelId, opponentId, score } = data;
    // Emit to opponent's room
    io.to(opponentId).emit('duel_completed', {
      duelId,
      challengerId: socket.userId,
      score,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
  });
});

// Start the server and listen on the specified port
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
