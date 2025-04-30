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
const GAME_STATE = require('./users/students/pvp/constants/gameStates');

// Import main routes
const mainRoutes = require("./core/routes");

// Import PVP controller
const pvpController = require('./users/students/pvp/controllers/pvpController');

// Create an Express application
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST"],
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
  path: '/socket.io/',
  maxHttpBufferSize: 1e8,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  }
});

// Initialize socket service with error handling
try {
  socketService.initializeSocket(io);
} catch (error) {
  console.error('Error initializing socket service:', error);
}

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

// Add detailed connection logging
io.engine.on("connection_error", (err) => {
  console.log('Connection error details:');
  console.log('- Request:', err.req?.url);
  console.log('- Code:', err.code);
  console.log('- Message:', err.message);
  console.log('- Context:', err.context);
});

// WebSocket authentication middleware with better error handling
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log('No token provided for socket:', socket.id);
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, jwtConfig.secret);
    socket.userId = decoded.id;
    socket.userName = decoded.firstName || 'Player';
    console.log('Socket authenticated:', socket.id, 'User:', socket.userId, 'Name:', socket.userName);
    next();
  } catch (err) {
    console.error('Socket authentication error:', err);
    next(new Error('Invalid authentication token'));
  }
});

// WebSocket connection handling with improved logging
io.on('connection', (socket) => {
  console.log('User connected:', socket.userId, 'Socket ID:', socket.id, 'Name:', socket.userName);

  // Join user's personal room for private messages
  socket.join(socket.userId);
  console.log('User joined personal room:', socket.userId);

  // Handle joining game room with better error handling
  socket.on('join_game_room', (data) => {
    try {
      const { lobbyId, playerId, playerName } = data;
      if (!lobbyId) {
        throw new Error('Lobby ID is required');
      }

      console.log('Player joining game room:', { 
        socketId: socket.id, 
        lobbyId,
        playerId: playerId || socket.userId,
        playerName: playerName || socket.userName
      });

      // Join the socket room
      socket.join(lobbyId);
      
      try {
        // Get current game state
        const game = pvpController.getGame(lobbyId);
        if (game) {
          const players = game.getPlayers();
          console.log('Current game state:', { 
            lobbyId, 
            playerCount: players.length,
            players: players,
            state: game.state
          });
          
          // Notify all players in the room about current state
          io.to(lobbyId).emit('room_status', {
            playerCount: players.length,
            players: players,
            state: game.state
          });
        }
      } catch (gameError) {
        // If game doesn't exist yet, that's okay - it will be created when the player joins
        console.log('Game not found yet for lobby:', lobbyId);
      }
    } catch (error) {
      console.error('Error in join_game_room:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle joining a game with improved error handling and logging
  socket.on('join_game', async (data) => {
    try {
      const { lobbyId, playerId, playerName } = data;
      console.log('Player joining game:', { 
        socketId: socket.id, 
        lobbyId, 
        playerId: playerId || socket.userId,
        playerName: playerName || socket.userName
      });

      // Ensure socket is in the room
      if (!socket.rooms.has(lobbyId)) {
        console.log('Socket not in room, joining:', lobbyId);
        socket.join(lobbyId);
      }

      // Join or create game
      const game = await pvpController.joinGame(lobbyId, playerId || socket.userId, playerName || socket.userName);
      const players = game.getPlayers();
      
      console.log('Game state after join:', {
        lobbyId,
        players: players,
        playerCount: players.length,
        state: game.state
      });

      // Notify all players about the join
      io.to(lobbyId).emit('player_joined', {
        playerId: playerId || socket.userId,
        playerName: playerName || socket.userName,
        playerCount: players.length,
        players: players,
        state: game.state
      });

      // If game is full, start the countdown
      if (players.length === 2) {
        console.log('Game is full, starting countdown:', lobbyId);
        game.state = GAME_STATE.RPS;
        io.to(lobbyId).emit('game_ready', {
          players: players,
          state: game.state
        });
      }
    } catch (error) {
      console.error('Error in join_game:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle ready for RPS
  socket.on('ready_for_rps', (data) => {
    try {
      const { lobbyId, playerId } = data;
      console.log('Player ready for RPS:', { socketId: socket.id, lobbyId, playerId });
      
      const game = pvpController.getGame(lobbyId);
      if (!game) {
        throw new Error('Game not found');
      }

      game.setPlayerReady(playerId);
      
      // If all players are ready, start RPS
      if (game.areAllPlayersReady()) {
        console.log('All players ready, starting RPS:', lobbyId);
        io.to(lobbyId).emit('start_rps');
      }
    } catch (error) {
      console.error('Error in ready_for_rps:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle RPS choice submission
  socket.on('rps_choice', async (data) => {
    const { lobbyId, choice } = data;
    const playerId = socket.userId; // Get playerId from authenticated socket
    console.log(`[Socket Event] rps_choice received: lobby ${lobbyId}, player ${playerId}, choice ${choice}`);
    try {
        await pvpController.handleRpsChoice(lobbyId, playerId, choice);
        // Controller handles emitting results/updates
    } catch (error) {
        console.error(`Error handling rps_choice for player ${playerId} in lobby ${lobbyId}:`, error);
        socket.emit('game_error', { message: error.message || 'Failed to process RPS choice' });
    }
  });

  // Handle Subject Selection
  socket.on('select_subject', async (data) => {
      const { lobbyId, subject } = data; // subject likely { id: ..., name: ... }
      const playerId = socket.userId;
      console.log(`[Socket Event] select_subject received: lobby ${lobbyId}, player ${playerId}, subject ${subject?.id}`);
      try {
          // Ensure subject object is passed correctly
          if (!subject || !subject.id || !subject.name) {
              throw new Error('Invalid subject data provided.');
          }
          await pvpController.handleSubjectSelection(lobbyId, playerId, { _id: subject.id, name: subject.name }); // Pass required fields
          // Controller now handles deck creation, dealing, and state transition internally
      } catch (error) {
          console.error(`Error handling select_subject for player ${playerId} in lobby ${lobbyId}:`, error);
          socket.emit('game_error', { message: error.message || 'Failed to process subject selection' });
      }
  });

  // Handle Dice Roll
  socket.on('dice_roll', async (data) => {
      const { lobbyId } = data;
      const playerId = socket.userId;
      console.log(`[Socket Event] dice_roll received: lobby ${lobbyId}, player ${playerId}`);
      try {
          await pvpController.handleDiceRoll(lobbyId, playerId);
          // Controller handles emitting results/updates
      } catch (error) {
          console.error(`Error handling dice_roll for player ${playerId} in lobby ${lobbyId}:`, error);
          socket.emit('game_error', { message: error.message || 'Failed to process dice roll' });
      }
  });

  // --- NEW Gameplay Event Listeners ---

  // Handle Summoning a Question Card
  socket.on('summon_card', async (data) => {
      const { lobbyId, cardId } = data;
      const playerId = socket.userId;
      console.log(`[Socket Event] summon_card received: lobby ${lobbyId}, player ${playerId}, card ${cardId}`);
      try {
          if (!cardId) throw new Error('Card ID is required to summon.');
          await pvpController.handleSummonCard(lobbyId, playerId, cardId);
          // Controller handles emitting updates
      } catch (error) {
          console.error(`Error handling summon_card for player ${playerId} in lobby ${lobbyId}:`, error);
          socket.emit('game_error', { message: error.message || 'Failed to summon card' });
      }
  });

  // Handle Playing a Spell/Effect Card
  socket.on('play_spell_effect', async (data) => {
      const { lobbyId, cardId } = data;
      const playerId = socket.userId;
      console.log(`[Socket Event] play_spell_effect received: lobby ${lobbyId}, player ${playerId}, card ${cardId}`);
      try {
           if (!cardId) throw new Error('Card ID is required to play spell/effect.');
          await pvpController.handlePlaySpellEffect(lobbyId, playerId, cardId);
          // Controller handles emitting updates and game over checks
      } catch (error) {
          console.error(`Error handling play_spell_effect for player ${playerId} in lobby ${lobbyId}:`, error);
          socket.emit('game_error', { message: error.message || 'Failed to play spell/effect card' });
      }
  });

  // Handle Submitting an Answer
  socket.on('submit_answer', async (data) => {
      const { lobbyId, answer } = data;
      const playerId = socket.userId;
      console.log(`[Socket Event] submit_answer received: lobby ${lobbyId}, player ${playerId}`);
      try {
          // Assuming 'answer' contains the necessary submitted value
          if (answer === undefined || answer === null) throw new Error('Answer value is required.');
          await pvpController.handleSubmitAnswer(lobbyId, playerId, answer);
          // Controller handles emitting results/updates and game over checks
      } catch (error) {
          console.error(`Error handling submit_answer for player ${playerId} in lobby ${lobbyId}:`, error);
          socket.emit('game_error', { message: error.message || 'Failed to submit answer' });
      }
  });

  // --- End NEW Gameplay Event Listeners ---

  // Handle player leaving a game room
  socket.on('leave_game_room', (lobbyId) => {
    // ... existing leave logic ...
  });

  // Handle player disconnect
  socket.on('disconnect', () => {
    // ... existing disconnect logic ...
    // Make sure handleDisconnect is called correctly
    console.log('User disconnected:', socket.userId, 'Socket ID:', socket.id);
    pvpController.handleDisconnect(socket.userId);
  });

  // Other event handlers...
});

// Start the server
server.listen(PORT, () => {
  console.log(`\n=== Server Started ===`);
  console.log(`Server is running on port ${PORT}`);
  console.log(`API base URL: http://localhost:${PORT}${config.api.prefix}`);
  console.log('Allowed CORS origins:', config.clientUrls);
  console.log('=====================\n');
});
