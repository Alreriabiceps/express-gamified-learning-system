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
const dashboardRoutes = require("./users/students/dashboard/routes/dashboardRoutes");

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

// Add dashboard routes under /api/dashboard
app.use(`${config.api.prefix}/dashboard`, (req, res, next) => {
    console.log(`Dashboard Route accessed: ${req.method} ${req.url}`);
    next();
}, dashboardRoutes);

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

  // Handle player disconnect
  socket.on('disconnect', () => {
    // ... existing disconnect logic ...
    // Make sure handleDisconnect is called correctly
    console.log('User disconnected:', socket.userId, 'Socket ID:', socket.id);
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
