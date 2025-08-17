const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const messageController = require("../users/students/chats/controllers/messageController");
const Question = require("../users/admin/question/models/questionModels");
const gameEngine = require("../services/gameEngine");
const GameRoom = require("../models/GameRoom");

class GameServer {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "Access-Control-Allow-Origin",
          "Access-Control-Allow-Headers",
          "Access-Control-Allow-Credentials",
        ],
      },
      transports: ["websocket", "polling"],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
      path: "/socket.io/",
      maxHttpBufferSize: 1e8,
    });

    this.games = new Map();
    this.players = new Map();
    this.rpsGames = new Map();

    // Add detailed connection logging
    this.io.engine.on("connection_error", (err) => {
      console.log("Connection error details:");
      console.log("- Request:", err.req?.url);
      console.log("- Code:", err.code);
      console.log("- Message:", err.message);
      console.log("- Context:", err.context);
    });

    // WebSocket authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          console.log("No token provided for socket:", socket.id);
          return next(new Error("Authentication token required"));
        }

        const decoded = jwt.verify(token, jwtConfig.secret);
        socket.userId = decoded.id;
        socket.userName = decoded.firstName || "Player";
        console.log(
          "Socket authenticated:",
          socket.id,
          "User:",
          socket.userId,
          "Name:",
          socket.userName
        );
        next();
      } catch (err) {
        console.error("Socket authentication error:", err);
        next(new Error("Invalid authentication token"));
      }
    });

    // Initialize socket event handlers
    this.initializeSocketHandlers();
  }

  initializeSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log(
        "User connected:",
        socket.userId,
        "Socket ID:",
        socket.id,
        "Name:",
        socket.userName
      );

      // Join user's personal room for private messages
      socket.join(socket.userId);
      console.log("User joined personal room:", socket.userId);

      // Chat event handlers
      socket.on("typing", ({ to }) => {
        if (to) {
          this.io.to(to).emit("typing", { from: socket.userId });
        }
      });

      socket.on("message:delivered", async ({ messageId }) => {
        if (messageId) {
          await messageController.markDelivered(messageId, this.io);
        }
      });

      socket.on("message:read", async ({ friendId }) => {
        if (friendId) {
          await messageController.markRead(socket.userId, friendId, this.io);
        }
      });

      // Game event handlers
      socket.on("createGame", async ({ numPlayers }) => {
        try {
          const gameId = Date.now().toString();
          const game = {
            id: gameId,
            players: [socket.userId],
            numPlayers,
            status: "waiting",
            currentPlayerIndex: 0,
            drawPile: [],
            playerHands: [],
            playerHP: [],
          };

          this.games.set(gameId, game);
          this.players.set(socket.userId, gameId);
          socket.join(gameId);

          this.io.to(gameId).emit("gameStateUpdate", game);
        } catch (error) {
          console.error("Error creating game:", error);
          socket.emit("error", { message: "Failed to create game" });
        }
      });

      socket.on("joinGame", async ({ gameId }) => {
        try {
          const game = this.games.get(gameId);
          if (!game) {
            socket.emit("error", { message: "Game not found" });
            return;
          }

          if (game.players.includes(socket.userId)) {
            // Player is already in the game, just join the socket room
            this.players.set(socket.userId, gameId);
            socket.join(gameId);
          } else if (game.players.length < game.numPlayers) {
            game.players.push(socket.userId);
            this.players.set(socket.userId, gameId);
            socket.join(gameId);
          } else {
            socket.emit("error", { message: "Game is full" });
            return;
          }

          if (game.players.length === game.numPlayers) {
            game.status = "in-progress";
            // Initialize game state here
          }

          this.io.to(gameId).emit("gameStateUpdate", game);
        } catch (error) {
          console.error("Error joining game:", error);
          socket.emit("error", { message: "Failed to join game" });
        }
      });

      socket.on("playCard", ({ gameId, cardIndex }) => {
        const game = this.games.get(gameId);
        if (!game || game.status !== "in-progress") return;

        // Handle card play logic here
        this.io.to(gameId).emit("gameStateUpdate", game);
      });

      socket.on("drawCard", ({ gameId }) => {
        const game = this.games.get(gameId);
        if (!game || game.status !== "in-progress") return;

        // Handle draw card logic here
        this.io.to(gameId).emit("gameStateUpdate", game);
      });

      socket.on("surrender", ({ gameId }) => {
        const game = this.games.get(gameId);
        if (!game || game.status !== "in-progress") return;

        // Handle surrender logic here
        this.io.to(gameId).emit("gameStateUpdate", game);
      });

      // Real-time game event handlers
      socket.on("join_game_room", async ({ roomId }) => {
        try {
          console.log(`Player ${socket.userId} joining game room: ${roomId}`);

          // Join the socket room
          socket.join(roomId);

          // Get game state from database
          const gameRoom = await GameRoom.findOne({ roomId });
          if (gameRoom) {
            // Store in memory for quick access
            gameEngine.games.set(roomId, gameRoom.toObject());

            // Broadcast updated game state to all players in room
            this.io.to(roomId).emit("game_state_update", {
              gameState: gameRoom.toObject(),
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          console.error("Error joining game room:", error);
          socket.emit("error", { message: "Failed to join game room" });
        }
      });

      socket.on("select_card", async ({ roomId, cardId }) => {
        try {
          const result = await gameEngine.processAction(roomId, socket.userId, {
            type: "select_card",
            cardId,
          });

          // Broadcast action to all players in room
          this.io.to(roomId).emit("opponent_action", {
            playerId: socket.userId,
            action: { type: "select_card", cardId },
            timestamp: Date.now(),
          });

          // Broadcast updated game state
          this.io.to(roomId).emit("game_state_update", {
            gameState: result.gameState,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error("Error selecting card:", error);
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("answer_question", async ({ roomId, answer }) => {
        try {
          const result = await gameEngine.processAction(roomId, socket.userId, {
            type: "answer_question",
            answer,
          });

          // Broadcast action to all players in room
          this.io.to(roomId).emit("opponent_action", {
            playerId: socket.userId,
            action: { type: "answer_question", answer },
            timestamp: Date.now(),
          });

          // Broadcast updated game state
          this.io.to(roomId).emit("game_state_update", {
            gameState: result.gameState,
            timestamp: Date.now(),
          });

          // If game is finished, emit game end event
          if (result.gameState.gameState === "finished") {
            this.io.to(roomId).emit("game_end", {
              winner: result.gameState.winner,
              gameState: result.gameState,
            });
          }
        } catch (error) {
          console.error("Error answering question:", error);
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("use_powerup", async ({ roomId, powerUpType }) => {
        try {
          const result = await gameEngine.processAction(roomId, socket.userId, {
            type: "use_powerup",
            powerUpType,
          });

          // Broadcast action to all players in room
          this.io.to(roomId).emit("opponent_action", {
            playerId: socket.userId,
            action: { type: "use_powerup", powerUpType },
            timestamp: Date.now(),
          });

          // Broadcast updated game state
          this.io.to(roomId).emit("game_state_update", {
            gameState: result.gameState,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error("Error using power-up:", error);
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("activate_spell", async ({ roomId, spellCard }) => {
        try {
          const result = await gameEngine.processAction(roomId, socket.userId, {
            type: "activate_spell",
            spellCard,
          });

          // Broadcast action to all players in room
          this.io.to(roomId).emit("opponent_action", {
            playerId: socket.userId,
            action: { type: "activate_spell", spellCard },
            timestamp: Date.now(),
          });

          // Broadcast updated game state
          this.io.to(roomId).emit("game_state_update", {
            gameState: result.gameState,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error("Error activating spell:", error);
          socket.emit("error", { message: error.message });
        }
      });

      // Rock Paper Scissors events
      socket.on("start_rps", ({ roomId }) => {
        try {
          console.log(`Starting RPS for room: ${roomId}`);

          // Initialize RPS game state for this room
          if (!this.rpsGames) {
            this.rpsGames = new Map();
          }

          this.rpsGames.set(roomId, {
            players: {},
            phase: "selecting",
          });

          // Notify all players in room that RPS phase started
          this.io.to(roomId).emit("rps_phase_start");
        } catch (error) {
          console.error("Error starting RPS:", error);
          socket.emit("error", {
            message: "Failed to start Rock Paper Scissors",
          });
        }
      });

      socket.on("rps_choice", async ({ roomId, choice, playerId }) => {
        try {
          console.log(
            `RPS choice from ${playerId}: ${choice} in room ${roomId}`
          );

          if (!this.rpsGames) {
            this.rpsGames = new Map();
          }

          const rpsGame = this.rpsGames.get(roomId);
          if (!rpsGame) {
            console.error(`RPS game not found for room ${roomId}`);
            socket.emit("error", { message: "RPS game not found" });
            return;
          }

          // Store player's choice
          rpsGame.players[playerId] = choice;
          console.log(
            `Stored choice for ${playerId}. Current choices:`,
            rpsGame.players
          );

          // Notify room that a choice was made (without revealing the choice)
          this.io.to(roomId).emit("rps_choice_made", { playerId });

          // Check if both players have made their choices
          const playerIds = Object.keys(rpsGame.players);
          console.log(
            `Total players who made choices: ${playerIds.length}`,
            playerIds
          );

          if (playerIds.length === 2) {
            console.log(
              "Both players have made choices, processing RPS result..."
            );
            // Get the actual game state to map player IDs to indices
            let playersArray = null;
            try {
              const gameRoom = await GameRoom.findOne({ roomId }).lean();
              if (
                gameRoom &&
                Array.isArray(gameRoom.players) &&
                gameRoom.players.length >= 2
              ) {
                playersArray = gameRoom.players;
                console.log(
                  `Found game room in DB with ${playersArray.length} players`
                );
              } else {
                console.warn(
                  `DB game room not found or invalid for roomId: ${roomId}. Falling back to in-memory state.`
                );
              }
            } catch (e) {
              console.warn(
                `Error fetching game room from DB for roomId ${roomId}:`,
                e?.message
              );
            }

            // Fallback to in-memory state if DB not available
            if (!playersArray) {
              const memState = gameEngine.getGameState(roomId);
              if (
                memState &&
                Array.isArray(memState.players) &&
                memState.players.length >= 2
              ) {
                playersArray = memState.players;
                console.log(
                  `Using in-memory game state with ${playersArray.length} players`
                );
              } else {
                console.error(`Unable to resolve players for roomId ${roomId}`);
                socket.emit("error", { message: "Game room not found" });
                return;
              }
            }

            console.log(`Player IDs who made choices:`, playerIds);
            console.log(
              `Game player IDs:`,
              playersArray.map((p) => p.userId)
            );

            // Map player IDs to their game indices
            const player1GameIndex = playersArray.findIndex(
              (p) => p.userId === playerIds[0]
            );
            const player2GameIndex = playersArray.findIndex(
              (p) => p.userId === playerIds[1]
            );

            console.log(
              `Player 1 (${playerIds[0]}) game index: ${player1GameIndex}`
            );
            console.log(
              `Player 2 (${playerIds[1]}) game index: ${player2GameIndex}`
            );

            if (player1GameIndex === -1 || player2GameIndex === -1) {
              console.error("Could not find one or both players in game room");
              socket.emit("error", {
                message: "Could not find players in game",
              });
              return;
            }

            const player1Choice = rpsGame.players[playerIds[0]];
            const player2Choice = rpsGame.players[playerIds[1]];

            console.log(
              `Choices: ${playerIds[0]} chose ${player1Choice}, ${playerIds[1]} chose ${player2Choice}`
            );

            // Determine winner based on choices
            const rpsResult = this.determineRpsWinner(
              player1Choice,
              player2Choice
            );

            console.log(`RPS raw result:`, rpsResult);

            // Map the winner to the actual game player index
            let actualWinner = null;
            if (!rpsResult.isDraw) {
              if (rpsResult.winner === 0) {
                actualWinner = player1GameIndex; // Use the actual game index of player1
              } else {
                actualWinner = player2GameIndex; // Use the actual game index of player2
              }
            }

            console.log(
              `Final RPS Result: ${player1Choice} vs ${player2Choice}, winner: player ${actualWinner} (game index)`
            );

            // Prepare richer payload so clients can resolve winner by userId
            const playersUserIds = playersArray.map((p) => p.userId);
            const choicesByUserId = {};
            Object.keys(rpsGame.players).forEach((pid) => {
              choicesByUserId[pid] = rpsGame.players[pid];
            });

            // Send results to all players with correct player indices and userIds
            console.log(`Emitting rps_result to room ${roomId}`);
            this.io.to(roomId).emit("rps_result", {
              player1Choice,
              player2Choice,
              winner: actualWinner, // index in playersArray (0 or 1)
              winnerUserId:
                !rpsResult.isDraw && actualWinner != null
                  ? playersUserIds[actualWinner]
                  : null,
              playersUserIds, // [player at index 0 userId, player at index 1 userId]
              choicesByUserId, // { userId: choice }
              isDraw: rpsResult.isDraw,
            });

            console.log(`RPS result emitted successfully`);

            // Update authoritative game state so turns are enforced server-side
            if (!rpsResult.isDraw) {
              try {
                const memState = gameEngine.getGameState(roomId);
                if (memState && Array.isArray(playersArray)) {
                  const winnerUserId = playersArray[actualWinner]?.userId;
                  if (winnerUserId) {
                    memState.currentTurn = winnerUserId;
                    memState.gamePhase = "cardSelection";
                    memState.selectedCard = null;
                    // Persist best-effort
                    if (typeof gameEngine.updateGameInDatabase === "function") {
                      gameEngine.updateGameInDatabase(memState);
                    }
                    // Broadcast sync state so clients update their turn/phase
                    this.io.to(roomId).emit("game_state_update", {
                      gameState: memState,
                      timestamp: Date.now(),
                    });
                  }
                }
              } catch (stateErr) {
                console.warn(
                  "Failed to update state after RPS:",
                  stateErr?.message
                );
              }
            }

            if (!rpsResult.isDraw) {
              // Clean up RPS game
              this.rpsGames.delete(roomId);
            } else {
              // Reset for another round
              rpsGame.players = {};
            }
          }
        } catch (error) {
          console.error("Error processing RPS choice:", error);
          socket.emit("error", { message: "Failed to process choice" });
        }
      });

      socket.on("leave_game_room", async ({ roomId }) => {
        try {
          console.log(`Player ${socket.userId} leaving game room: ${roomId}`);

          // Leave the socket room
          socket.leave(roomId);

          // Clean up game if no players left
          const gameState = gameEngine.getGameState(roomId);
          if (gameState && gameState.players.length === 0) {
            await gameEngine.cleanupGame(roomId);
          }
        } catch (error) {
          console.error("Error leaving game room:", error);
        }
      });

      // Handle player disconnect
      socket.on("disconnect", () => {
        console.log(
          "User disconnected:",
          socket.userId,
          "Socket ID:",
          socket.id
        );

        // Handle game cleanup if player was in a game
        const gameId = this.players.get(socket.userId);
        if (gameId) {
          const game = this.games.get(gameId);
          if (game) {
            game.players = game.players.filter((id) => id !== socket.userId);
            if (game.players.length === 0) {
              this.games.delete(gameId);
            } else {
              this.io.to(gameId).emit("gameStateUpdate", game);
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
      const questionCards = questions.map((q) => ({
        id: q._id,
        type: "QUESTION",
        questionData: q,
      }));

      // Create draw pile
      game.drawPile = this.shuffleArray([...questionCards]);

      // Deal initial hands
      game.players.forEach((player) => {
        player.hand = game.drawPile.splice(0, 7);
      });

      game.status = "playing";
      game.currentPlayerIndex = 0;

      // Broadcast initial game state
      this.broadcastGameState(gameId);
    } catch (error) {
      console.error("Error initializing game:", error);
      this.io
        .to(gameId)
        .emit("error", { message: "Failed to initialize game" });
    }
  }

  broadcastGameState(gameId) {
    const game = this.games.get(gameId);
    if (!game) return;

    const gameState = {
      drawPile: game.drawPile,
      playerHands: game.players.map((p) => p.hand),
      currentPlayerIndex: game.currentPlayerIndex,
      playerHP: game.players.map((p) => p.hp),
      message: this.getGameMessage(game),
      gameOver: game.status === "finished",
    };

    this.io.to(gameId).emit("gameStateUpdate", gameState);
  }

  getGameMessage(game) {
    if (game.status === "finished") {
      const winner = game.players.find((p) => p.id === game.winner);
      return `Game Over! ${
        winner ? "Player " + (game.players.indexOf(winner) + 1) : "Unknown"
      } wins!`;
    }
    return `Player ${game.currentPlayerIndex + 1}'s turn`;
  }

  handlePlayerDisconnect(socket) {
    // Find and handle games where the player was participating
    for (const [gameId, game] of this.games.entries()) {
      const playerIndex = game.players.findIndex(
        (p) => p.socketId === socket.id
      );
      if (playerIndex !== -1) {
        // Handle player disconnection
        game.status = "finished";
        game.winner = game.players.find((p) => p.socketId !== socket.id)?.id;
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

  // Game initialization is now handled by the gameEngine service
  // when the frontend calls /api/game/initialize

  determineRpsWinner(choice1, choice2) {
    if (choice1 === choice2) {
      return { winner: null, isDraw: true };
    }

    const winConditions = {
      rock: "scissors",
      paper: "rock",
      scissors: "paper",
    };

    if (winConditions[choice1] === choice2) {
      return { winner: 0, isDraw: false }; // Player 1 wins
    } else {
      return { winner: 1, isDraw: false }; // Player 2 wins
    }
  }
}

module.exports = GameServer;
