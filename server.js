// Load environment variables from .env file
require("dotenv").config();

// Import necessary packages
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Import configurations
const config = require('./config/config');
const corsConfig = require('./config/cors');
const jwtConfig = require('./config/jwt');
const connectDB = require('./config/db');

// Import main routes
const mainRoutes = require("./core/routes");

// Create an Express application
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.clientUrls,
    methods: ['GET', 'POST']
  }
});

// Set the port for the server
const PORT = config.server.port;

// Connect to MongoDB using Mongoose
connectDB();

// Apply middleware to handle CORS and JSON requests
app.use(cors(corsConfig));
app.use(express.json()); // Parse JSON request bodies

// Add detailed request logging middleware
app.use((req, res, next) => {
  console.log('\n=== New Request ===');
  console.log('Time:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  console.log('Params:', req.params);
  console.log('==================\n');
  next();
});

// Define API routes with logging
app.use(config.api.prefix, (req, res, next) => {
  console.log(`API Route accessed: ${req.method} ${req.url}`);
  next();
}, mainRoutes);

// Add route logging middleware after routes are defined
app.use((req, res, next) => {
  console.log('Route not found:', req.method, req.url);
  next();
});

// Root route for testing if the server is running
app.get("/", (req, res) => {
  res.send("Hello from Express server!");
});

// Catch-all route handler for undefined routes (404 error)
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.url);
  res.status(404).json({ error: "Route not found" });
});

// Global error handler for unhandled errors
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// WebSocket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
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
    io.to(opponentId).emit('duel_challenge', {
      challengerId: socket.userId,
      timestamp: new Date()
    });
  });

  // Handle duel acceptance
  socket.on('accept_duel', async (data) => {
    const { duelId, challengerId } = data;
    io.to(challengerId).emit('duel_accepted', {
      duelId,
      opponentId: socket.userId,
      timestamp: new Date()
    });
  });

  // Handle duel completion
  socket.on('complete_duel', async (data) => {
    const { duelId, opponentId, score } = data;
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

// Start the server
server.listen(PORT, () => {
  console.log(`\n=== Server Started ===`);
  console.log(`Server is running on port ${PORT}`);
  console.log(`API base URL: http://localhost:${PORT}${config.api.prefix}`);
  console.log('Allowed CORS origins:', config.clientUrls);
  console.log('=====================\n');
});
