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
const socketService = require('./services/socketService');

// Import main routes
const mainRoutes = require("./core/routes");

// Import PVP controller
const pvpController = require('./users/students/pvp/controllers/pvpController');

// Create an Express application
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (config.clientUrls.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Credentials'
    ]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  path: '/socket.io/'
});

// Initialize socket service
socketService.initializeSocket(io);

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

  // Handle joining a game
  socket.on('join_game', async (data) => {
    const { lobbyId, playerName } = data;
    try {
      // Create game if it doesn't exist
      let game = await pvpController.createGame(lobbyId);
      
      // Join the game
      game = await pvpController.joinGame(lobbyId, socket.userId, playerName);
      
      // Join the socket room for this game
      socket.join(lobbyId);
      
      // Notify other players in the lobby
      socket.to(lobbyId).emit('opponent_joined', {
        opponentId: socket.userId,
        opponentName: playerName
      });

      console.log(`User ${socket.userId} joined game lobby ${lobbyId}`);
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', { message: 'Failed to join game' });
    }
  });

  // Handle RPS choice
  socket.on('rps_choice', async (data) => {
    const { choice, lobbyId } = data;
    try {
      const result = await pvpController.handleRpsChoice(lobbyId, socket.userId, choice);
      
      // Broadcast the choice to other players in the lobby
      socket.to(lobbyId).emit('opponent_rps_choice', choice);
      
      // If both players have made their choices, broadcast the result
      if (result) {
        io.to(lobbyId).emit('rps_result', {
          result: result.winner,
          timestamp: new Date()
        });
      }
      
      console.log(`User ${socket.userId} chose ${choice} in RPS`);
    } catch (error) {
      console.error('Error handling RPS choice:', error);
      socket.emit('error', { message: 'Failed to process RPS choice' });
    }
  });

  // Handle subject selection
  socket.on('subject_selected', async (data) => {
    const { subject, lobbyId } = data;
    try {
      const game = await pvpController.handleSubjectSelection(lobbyId, subject);
      
      // Broadcast the selected subject to all players
      io.to(lobbyId).emit('subject_selected', {
        subject,
        selectedBy: socket.userId,
        questions: game.questions
      });
      
      console.log(`User ${socket.userId} selected subject ${subject.name}`);
    } catch (error) {
      console.error('Error handling subject selection:', error);
      socket.emit('error', { message: 'Failed to process subject selection' });
    }
  });

  // Handle answer submission
  socket.on('submit_answer', async (data) => {
    const { answer, questionId, lobbyId } = data;
    try {
      const result = await pvpController.handleAnswerSubmission(lobbyId, socket.userId, questionId, answer);
      
      // Broadcast the answer result to other players
      socket.to(lobbyId).emit('opponent_answer_submitted', {
        answer,
        questionId,
        answeredBy: socket.userId,
        isCorrect: result.isCorrect
      });
      
      // If the game is over, broadcast the result
      if (result.gameOver) {
        io.to(lobbyId).emit('game_ended', {
          winner: result.winner,
          timestamp: new Date()
        });
        
        // Clean up the game
        await pvpController.endGame(lobbyId);
      }
      
      console.log(`User ${socket.userId} submitted answer for question ${questionId}`);
    } catch (error) {
      console.error('Error handling answer submission:', error);
      socket.emit('error', { message: 'Failed to process answer submission' });
    }
  });

  // Handle game completion
  socket.on('game_complete', async (data) => {
    const { lobbyId, winner, finalScore } = data;
    try {
      // End the game
      await pvpController.endGame(lobbyId);
      
      // Broadcast game completion to all players
      io.to(lobbyId).emit('game_ended', {
        winner,
        finalScore,
        timestamp: new Date()
      });
      
      console.log(`Game completed in lobby ${lobbyId}. Winner: ${winner}`);
    } catch (error) {
      console.error('Error handling game completion:', error);
      socket.emit('error', { message: 'Failed to process game completion' });
    }
  });

  // Handle player disconnect
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.userId);
    try {
      await pvpController.handleDisconnect(socket.userId);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });

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
});

// Start the server
server.listen(PORT, () => {
  console.log(`\n=== Server Started ===`);
  console.log(`Server is running on port ${PORT}`);
  console.log(`API base URL: http://localhost:${PORT}${config.api.prefix}`);
  console.log('Allowed CORS origins:', config.clientUrls);
  console.log('=====================\n');
});
