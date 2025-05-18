const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const messageController = require('../users/students/chats/controllers/messageController');
const Question = require('../users/admin/question/models/questionModels');

class GameServer {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
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
      maxHttpBufferSize: 1e8
    });

    this.games = new Map();
    this.players = new Map();

    // Add detailed connection logging
    this.io.engine.on("connection_error", (err) => {
      console.log('Connection error details:');
      console.log('- Request:', err.req?.url);
      console.log('- Code:', err.code);
      console.log('- Message:', err.message);
      console.log('- Context:', err.context);
    });

    // WebSocket authentication middleware
    this.io.use(async (socket, next) => {
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

    // Initialize socket event handlers
    this.initializeSocketHandlers();
  }

  initializeSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.userId, 'Socket ID:', socket.id, 'Name:', socket.userName);

      // Join user's personal room for private messages
      socket.join(socket.userId);
      console.log('User joined personal room:', socket.userId);

      // Chat event handlers
      socket.on('typing', ({ to }) => {
        if (to) {
          this.io.to(to).emit('typing', { from: socket.userId });
        }
      });

      socket.on('message:delivered', async ({ messageId }) => {
        if (messageId) {
          await messageController.markDelivered(messageId, this.io);
        }
      });

      socket.on('message:read', async ({ friendId }) => {
        if (friendId) {
          await messageController.markRead(socket.userId, friendId, this.io);
        }
      });

      // Game event handlers
      socket.on('createGame', async ({ numPlayers }) => {
        try {
          const gameId = Date.now().toString();
          const game = {
            id: gameId,
            players: [socket.userId],
            numPlayers,
            status: 'waiting',
            currentPlayerIndex: 0,
            drawPile: [],
            playerHands: [],
            playerHP: []
          };

          this.games.set(gameId, game);
          this.players.set(socket.userId, gameId);
          socket.join(gameId);

          this.io.to(gameId).emit('gameStateUpdate', game);
        } catch (error) {
          console.error('Error creating game:', error);
          socket.emit('error', { message: 'Failed to create game' });
        }
      });

      socket.on('joinGame', async ({ gameId }) => {
        try {
          const game = this.games.get(gameId);
          if (!game) {
            socket.emit('error', { message: 'Game not found' });
            return;
          }

          if (game.players.length >= game.numPlayers) {
            socket.emit('error', { message: 'Game is full' });
            return;
          }

          game.players.push(socket.userId);
          this.players.set(socket.userId, gameId);
          socket.join(gameId);

          if (game.players.length === game.numPlayers) {
            game.status = 'in-progress';
            // Initialize game state here
          }

          this.io.to(gameId).emit('gameStateUpdate', game);
        } catch (error) {
          console.error('Error joining game:', error);
          socket.emit('error', { message: 'Failed to join game' });
        }
      });

      socket.on('playCard', ({ gameId, cardIndex }) => {
        const game = this.games.get(gameId);
        if (!game || game.status !== 'in-progress') return;

        // Handle card play logic here
        this.io.to(gameId).emit('gameStateUpdate', game);
      });

      socket.on('drawCard', ({ gameId }) => {
        const game = this.games.get(gameId);
        if (!game || game.status !== 'in-progress') return;

        // Handle draw card logic here
        this.io.to(gameId).emit('gameStateUpdate', game);
      });

      socket.on('surrender', ({ gameId }) => {
        const game = this.games.get(gameId);
        if (!game || game.status !== 'in-progress') return;

        // Handle surrender logic here
        this.io.to(gameId).emit('gameStateUpdate', game);
      });

      // Handle player disconnect
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.userId, 'Socket ID:', socket.id);
        
        // Handle game cleanup if player was in a game
        const gameId = this.players.get(socket.userId);
        if (gameId) {
          const game = this.games.get(gameId);
          if (game) {
            game.players = game.players.filter(id => id !== socket.userId);
            if (game.players.length === 0) {
              this.games.delete(gameId);
            } else {
              this.io.to(gameId).emit('gameStateUpdate', game);
            }
          }
          this.players.delete(socket.userId);
        }
      });
    });
  }

  async initializeGame(gameId) {
    try {
      const game = this.games.get(gameId);
      if (!game) return;

      // Fetch questions from database
      const questions = await Question.find().limit(20);
      
      // Create question cards
      const questionCards = questions.map(q => ({
        id: q._id,
        type: 'QUESTION',
        questionData: q
      }));

      // Create draw pile
      game.drawPile = this.shuffleArray([...questionCards]);
      
      // Deal initial hands
      game.players.forEach(player => {
        player.hand = game.drawPile.splice(0, 7);
      });

      game.status = 'playing';
      game.currentPlayerIndex = 0;

      // Broadcast initial game state
      this.broadcastGameState(gameId);
    } catch (error) {
      console.error('Error initializing game:', error);
      this.io.to(gameId).emit('error', { message: 'Failed to initialize game' });
    }
  }

  broadcastGameState(gameId) {
    const game = this.games.get(gameId);
    if (!game) return;

    const gameState = {
      drawPile: game.drawPile,
      playerHands: game.players.map(p => p.hand),
      currentPlayerIndex: game.currentPlayerIndex,
      playerHP: game.players.map(p => p.hp),
      message: this.getGameMessage(game),
      gameOver: game.status === 'finished'
    };

    this.io.to(gameId).emit('gameStateUpdate', gameState);
  }

  getGameMessage(game) {
    if (game.status === 'finished') {
      const winner = game.players.find(p => p.id === game.winner);
      return `Game Over! ${winner ? 'Player ' + (game.players.indexOf(winner) + 1) : 'Unknown'} wins!`;
    }
    return `Player ${game.currentPlayerIndex + 1}'s turn`;
  }

  handlePlayerDisconnect(socket) {
    // Find and handle games where the player was participating
    for (const [gameId, game] of this.games.entries()) {
      const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        // Handle player disconnection
        game.status = 'finished';
        game.winner = game.players.find(p => p.socketId !== socket.id)?.id;
        this.broadcastGameState(gameId);
        
        // Clean up game after a delay
        setTimeout(() => {
          this.games.delete(gameId);
        }, 5000);
      }
    }
  }

  generateGameId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  createGameFromLobby(lobby) {
    const gameId = lobby._id.toString();
    if (this.games.has(gameId)) return; // Prevent duplicate

    const players = lobby.players.map(p => p._id ? p._id.toString() : p.toString());
    const numPlayers = players.length;

    const game = {
      id: gameId,
      players,
      numPlayers,
      status: 'in-progress',
      currentPlayerIndex: 0,
      drawPile: [],
      playerHands: Array(numPlayers).fill().map(() => []),
      playerHP: Array(numPlayers).fill(100)
    };

    this.games.set(gameId, game);
    players.forEach(pid => this.players.set(pid, gameId));
    this.io.to(gameId).emit('gameStateUpdate', game);
  }
}

module.exports = GameServer; 