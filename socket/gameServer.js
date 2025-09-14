const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const messageController = require("../users/students/chats/controllers/messageController");
const Question = require("../users/admin/question/models/questionModels");
const gameEngine = require("../services/gameEngine");
const GameRoom = require("../models/GameRoom");
const PvPMatch = require("../users/students/pvp/models/pvpMatchModel");
const Student = require("../users/admin/student/models/studentModels");
const { transformCardFromDatabase } = require("../services/utils/gameUtils");

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
    this.playerRooms = new Map(); // Track which room each player is in

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

        // Get full player name from database
        try {
          const student = await Student.findById(decoded.id);
          if (student) {
            socket.userName =
              `${student.firstName} ${student.lastName}`.trim() || "Player";
          } else {
            socket.userName = decoded.firstName || "Player";
          }
        } catch (error) {
          console.error("Error fetching student name:", error);
          socket.userName = decoded.firstName || "Player";
        }

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
    // Add global error handler to prevent crashes
    this.io.engine.on("connection_error", (err) => {
      console.error("❌ Socket.IO connection error:", err);
    });

    // Add global error handler for unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
    });

    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
    });

    this.io.on("connection", (socket) => {
      // Team test rooms: allow client to join a specific attempt room
      socket.on("teamtest:join", ({ attemptId }) => {
        if (!attemptId) return;
        const room = `teamtest:${attemptId}`;
        socket.join(room);
        socket.emit("teamtest:joined", { room });
      });

      socket.on("teamtest:leave", ({ attemptId }) => {
        if (!attemptId) return;
        const room = `teamtest:${attemptId}`;
        socket.leave(room);
      });
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

      // Check if player was in a game room before disconnecting
      const previousRoom = this.playerRooms.get(socket.userId);
      if (previousRoom) {
        console.log(
          `🔄 Player ${socket.userId} was in room ${previousRoom}, checking if still active...`
        );

        // Check if the previous room still has an active game
        const gameState = gameEngine.getGameState(previousRoom);
        if (gameState && gameState.gameState !== "finished") {
          console.log(
            `✅ Previous room ${previousRoom} is still active, rejoining...`
          );
          socket.join(previousRoom);
          console.log(
            `✅ Player ${socket.userId} rejoined room ${previousRoom}`
          );

          // Send current game state to the reconnected player
          console.log(
            `📡 Sending game state to reconnected player ${socket.userId}`
          );
          socket.emit("game_state_update", {
            gameState: gameState,
            timestamp: Date.now(),
          });
        } else {
          console.log(
            `⚠️ Previous room ${previousRoom} is no longer active, clearing mapping`
          );
          // Clear the old room mapping since the game is finished or room doesn't exist
          this.playerRooms.delete(socket.userId);
        }
      }

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

      // Removed old game creation handlers - using new PvP system instead

      // Card selection and answer submission events
      socket.on(
        "game:card_selected",
        async ({ roomId, gameId, playerId, card, targetPlayerId }) => {
          console.log("🎴 Card selected event received:", {
            roomId,
            gameId,
            playerId,
            targetPlayerId,
            cardId: card?.id,
            cardType: card?.type,
          });

          console.log(
            "🎴 Full card data received:",
            JSON.stringify(card, null, 2)
          );

          try {
            // Process the card selection through the game engine
            const result = await gameEngine.processAction(roomId, playerId, {
              type: "select_card",
              cardId: card.id,
              card: card,
            });

            console.log("✅ Card selection processed:", result);

            // Send personalized game state to each player
            result.gameState.players.forEach((player) => {
              // Create a filtered game state for this player
              const playerGameState = {
                ...result.gameState,
                players: result.gameState.players.map((p) => ({
                  ...p,
                  // Only show cards to the player themselves, hide opponent's cards
                  // Transform cards to frontend format
                  cards:
                    p.userId === player.userId
                      ? p.cards.map((card) => transformCardFromDatabase(card))
                      : [],
                })),
              };

              this.io.to(player.userId).emit("game_state_update", {
                gameState: playerGameState,
                timestamp: Date.now(),
              });
            });

            // Forward the card selection to the target player for UI updates
            this.io.to(targetPlayerId).emit("question_challenge", {
              playerId,
              card,
              targetPlayerId,
              roomId,
              gameId,
              gameState: result.gameState,
            });

            console.log(
              `📡 Card selection processed and forwarded to player ${targetPlayerId}`
            );
          } catch (error) {
            console.error("❌ Error processing card selection:", error);
            console.error("❌ Error details:", {
              message: error.message,
              stack: error.stack,
              roomId,
              playerId,
              cardId: card?.id,
            });

            // Send error to the specific player who selected the card
            socket.emit("game:error", {
              message: "Failed to process card selection",
              error: error.message,
              roomId,
              gameId,
            });

            // Also send to the room for debugging
            this.io.to(roomId).emit("game:error", {
              message: "Card selection failed",
              roomId,
              gameId,
            });
          }
        }
      );

      socket.on(
        "game:submit_answer",
        async ({
          roomId,
          gameId,
          playerId,
          challengerId,
          card,
          answer,
          isCorrect,
          damage,
        }) => {
          console.log("📝 Answer submitted event received:", {
            roomId,
            gameId,
            playerId,
            challengerId,
            isCorrect,
            damage,
          });

          try {
            // Process the answer through the game engine
            const result = await gameEngine.processAction(roomId, playerId, {
              type: "answer_question",
              answer: answer,
            });

            console.log("✅ Answer processed:", result);

            // Game engine has already processed the answer and updated the game state

            // Game engine has already applied damage and updated the game state

            console.log(
              "📤 Sending game state update after answer processing:",
              {
                hpValues: result.gameState.players.map((p) => ({
                  userId: p.userId,
                  name: p.name,
                  hp: p.hp,
                  maxHp: p.maxHp,
                })),
              }
            );

            // Send personalized game state to each player
            result.gameState.players.forEach((player) => {
              // Create a filtered game state for this player
              const playerGameState = {
                ...result.gameState,
                players: result.gameState.players.map((p) => ({
                  ...p,
                  // Only show cards to the player themselves, hide opponent's cards
                  cards: p.userId === player.userId ? p.cards : [],
                })),
              };

              this.io.to(player.userId).emit("game_state_update", {
                gameState: playerGameState,
                timestamp: Date.now(),
              });
            });

            // Send answer result to both players
            this.io.to(roomId).emit("game:answer_submitted", {
              playerId,
              challengerId,
              isCorrect: result.isCorrect,
              damage: result.damage,
              answer: result.answer,
              gameOver: result.gameState.gameState === "finished",
              winner: result.gameState.winner,
              gameState: result.gameState,
              selectedCard: result.selectedCard, // Include the selected card data
            });

            // Send updated game state to both players
            console.log(
              "🔄 Broadcasting updated game state after answer processing"
            );

            // Transform cards to frontend format before sending
            const transformedGameState = {
              ...result.gameState,
              players: result.gameState.players.map((p) => ({
                ...p,
                cards: p.cards.map((card) => transformCardFromDatabase(card)),
              })),
            };

            this.io.to(roomId).emit("game_state_update", {
              gameState: transformedGameState,
              timestamp: Date.now(),
            });

            // If game is over, emit game over event and create PvP match record
            if (result.gameState.gameState === "finished") {
              console.log("🏁 Game finished! Emitting game over event");

              // Emit game over event to all players
              this.io.to(roomId).emit("game:game_over", {
                winner: result.gameState.winner,
                winnerName:
                  result.gameState.players.find(
                    (p) => p.userId === result.gameState.winner
                  )?.name || "Winner",
                finalScores: {
                  [result.gameState.players[0].userId]:
                    result.gameState.players[0].hp,
                  [result.gameState.players[1].userId]:
                    result.gameState.players[1].hp,
                },
                gameState: result.gameState,
              });

              try {
                // Get correct answers from game state
                const player1CorrectAnswers =
                  result.gameState.players[0].correctAnswers || 0;
                const player2CorrectAnswers =
                  result.gameState.players[1].correctAnswers || 0;
                const totalQuestions = result.gameState.totalQuestions || 0;
                const matchDuration = result.gameState.matchDuration || 0;

                console.log("📊 Creating PvP match record with data:", {
                  roomId,
                  gameId,
                  player1Id: result.gameState.players[0].userId,
                  player2Id: result.gameState.players[1].userId,
                  winnerId: result.gameState.winner,
                  player1Score: player1CorrectAnswers, // Correct answers as score
                  player2Score: player2CorrectAnswers, // Correct answers as score
                  player1HP: result.gameState.players[0].hp, // HP for reference
                  player2HP: result.gameState.players[1].hp, // HP for reference
                  player1CorrectAnswers,
                  player2CorrectAnswers,
                  totalQuestions,
                  matchDuration: Math.round(matchDuration / 1000) + " seconds",
                });

                const pvpMatch = await this.createAndCompletePvPMatch({
                  roomId,
                  gameId,
                  player1Id: result.gameState.players[0].userId,
                  player2Id: result.gameState.players[1].userId,
                  winnerId: result.gameState.winner,
                  player1Score: player1CorrectAnswers, // Use correct answers as score
                  player2Score: player2CorrectAnswers, // Use correct answers as score
                  player1CorrectAnswers,
                  player2CorrectAnswers,
                  totalQuestions,
                  matchDuration,
                });

                console.log("✅ PvP match created successfully:", pvpMatch._id);
              } catch (pvpError) {
                console.error("❌ Error creating PvP match record:", pvpError);
              }
            }

            console.log("✅ Answer processed and broadcasted");
          } catch (error) {
            console.error("❌ Error processing answer submission:", error);
            console.error("❌ Error details:", {
              message: error.message,
              stack: error.stack,
              roomId,
              playerId,
              answer,
              errorName: error.name,
              errorCode: error.code,
            });

            // Send detailed error to the specific player who submitted the answer
            socket.emit("game:error", {
              message: "Failed to process answer submission",
              error: error.message,
              errorDetails: {
                name: error.name,
                code: error.code,
                stack: error.stack,
              },
              roomId,
              gameId,
            });

            // Do NOT broadcast answer submission errors to the whole room,
            // as this can incorrectly show a global error UI to both players.
            // Keep the error scoped to the submitting socket only.
          }
        }
      );

      // Join game room for real-time PvP
      socket.on("join_game_room", async ({ roomId }) => {
        try {
          console.log(`Player ${socket.userId} joining game room: ${roomId}`);

          // Track player's room membership
          this.playerRooms.set(socket.userId, roomId);

          // Join the socket room
          socket.join(roomId);

          // Ensure the room exists in Socket.IO adapter
          const room = this.io.sockets.adapter.rooms.get(roomId);
          console.log(
            `🏠 Room ${roomId} has ${room ? room.size : 0} members after join`
          );

          // Confirm join to the client
          socket.emit("server:joined_room", { roomId });

          // Get game state from database
          console.log(
            `🔍 Looking for game state in database for room: ${roomId}`
          );

          // First, let's check if the database is working
          const totalRooms = await GameRoom.countDocuments();
          console.log(`📊 Total rooms in database: ${totalRooms}`);

          const gameRoom = await GameRoom.findOne({ roomId });
          if (gameRoom) {
            console.log(`📋 Found game state in database for room: ${roomId}`);

            // Transform the game state to frontend format
            const {
              transformCardFromDatabase,
            } = require("../services/utils/gameUtils");

            const transformedGameState = {
              ...gameRoom.toObject(),
              players: gameRoom.players.map((player) => ({
                ...player.toObject(),
                cards: player.cards.map(transformCardFromDatabase),
              })),
              deck: gameRoom.deck.map(transformCardFromDatabase),
            };

            // Store in memory for quick access
            gameEngine.games.set(roomId, transformedGameState);

            console.log(`📊 Game state found:`, {
              players: transformedGameState.players?.length || 0,
              currentTurn: transformedGameState.currentTurn,
              deck: transformedGameState.deck?.length || 0,
              gamePhase: transformedGameState.gamePhase,
            });

            // Broadcast updated game state to all players in room
            console.log(`🔄 Broadcasting game state to room: ${roomId}`);
            this.io.to(roomId).emit("game_state_update", {
              gameState: transformedGameState,
              timestamp: Date.now(),
            });

            // Also send to this player's personal room as backup
            this.io.to(socket.userId).emit("game_state_update", {
              gameState: transformedGameState,
              timestamp: Date.now(),
            });

            console.log(
              `📡 Game state sent to player ${socket.userId} and room ${roomId}`
            );
          } else {
            console.warn(
              `❌ No game state found in database for room: ${roomId}`
            );
            console.log(
              `🔍 Available rooms in database:`,
              await GameRoom.find({}).select("roomId gameId").limit(5)
            );

            // Fallback: check if we have room membership data
            try {
              const room = this.io.sockets.adapter.rooms.get(roomId);
              const connectedCount = room ? room.size : 0;
              console.log(
                `🛟 Fallback initializer check for ${roomId} — connected players: ${connectedCount}`
              );

              // Check if we have players tracked for this room
              const trackedPlayers = Array.from(this.playerRooms.entries())
                .filter(([_, trackedRoomId]) => trackedRoomId === roomId)
                .map(([playerId, _]) => playerId);

              console.log(
                `👥 Tracked players for room ${roomId}:`,
                trackedPlayers
              );

              if (trackedPlayers.length >= 2) {
                // Build players array from tracked players
                const playerSockets = trackedPlayers
                  .map((playerId) => {
                    // Find socket by userId
                    for (const [
                      socketId,
                      socket,
                    ] of this.io.sockets.sockets.entries()) {
                      if (socket.userId === playerId) {
                        return socket;
                      }
                    }
                    return null;
                  })
                  .filter(Boolean);

                const players = playerSockets.map((s, idx) => ({
                  userId: String(s.userId || `temp_${idx}`),
                  username: String(s.userName || `Player ${idx + 1}`),
                }));

                // Use a generated lobbyId; gameEngine will coerce to ObjectId
                const generatedLobbyId = `fallback_${Date.now()}`;
                console.log(
                  `🛠️ Running fallback initializeGame for ${roomId} with players:`,
                  players
                );

                const initializedState = await gameEngine.initializeGame(
                  roomId,
                  players,
                  generatedLobbyId
                );

                if (initializedState) {
                  // Keep in memory
                  gameEngine.games.set(roomId, initializedState);

                  // Broadcast the freshly created state
                  this.io.to(roomId).emit("game_state_update", {
                    gameState: initializedState,
                    timestamp: Date.now(),
                  });

                  // Also send directly to each player's personal room
                  players.forEach((p) => {
                    this.io.to(p.userId).emit("game_state_update", {
                      gameState: initializedState,
                      timestamp: Date.now(),
                    });
                  });

                  // Emit game start notification
                  if (
                    initializedState &&
                    initializedState.currentTurn &&
                    Array.isArray(initializedState.players) &&
                    initializedState.players.length === 2
                  ) {
                    const firstPlayer = initializedState.players.find(
                      (p) => p.userId === initializedState.currentTurn
                    );
                    const secondPlayer = initializedState.players.find(
                      (p) => p.userId !== initializedState.currentTurn
                    );

                    if (firstPlayer && secondPlayer) {
                      const firstPlayerName =
                        firstPlayer.username || firstPlayer.name || "Player";
                      const gameStartData = {
                        firstPlayer: {
                          name: firstPlayerName,
                          userId: firstPlayer.userId,
                        },
                        secondPlayer: {
                          name:
                            secondPlayer.username ||
                            secondPlayer.name ||
                            "Player",
                          userId: secondPlayer.userId,
                        },
                        message: `🎮 ${firstPlayerName} goes first!`,
                        timestamp: Date.now(),
                      };

                      // Personalize for each player
                      players.forEach((p) => {
                        const isFirstPlayer = p.userId === firstPlayer.userId;
                        const personalized = {
                          ...gameStartData,
                          isFirstPlayer,
                          message: isFirstPlayer
                            ? `🎮 You go first!`
                            : `🎮 ${firstPlayerName} goes first!`,
                        };
                        this.io.to(p.userId).emit("game_start", personalized);
                      });
                    }
                  }

                  console.log(
                    `✅ Fallback game initialization completed for room: ${roomId}`
                  );
                } else {
                  console.warn(
                    `⚠️ Fallback initialization returned no state for room: ${roomId}`
                  );
                  socket.emit("error", {
                    message: "Game not found. Please create a new game.",
                  });
                }
              } else {
                // Not enough players connected to safely initialize — instruct client
                socket.emit("error", {
                  message: "Game not found. Please create a new game.",
                });
              }
            } catch (fallbackErr) {
              console.error("❌ Fallback initialization failed:", fallbackErr);
              socket.emit("error", {
                message: "Failed to auto-initialize game room.",
              });
            }
          }
        } catch (error) {
          console.error("Error joining game room:", error);
          socket.emit("error", { message: "Failed to join game room" });
        }
      });

      // Removed duplicate select_card handler - using game:card_selected instead

      // Removed duplicate answer_question handler - using game:submit_answer instead

      // Power-up usage handler
      socket.on("use_powerup", async ({ roomId, powerUpId }) => {
        try {
          console.log(
            `⚡ Player ${socket.userId} using power-up: ${powerUpId} in room ${roomId}`
          );

          // Get game state (in-memory)
          const gameState = gameEngine.games.get(roomId);
          if (!gameState) {
            console.error(`Game not found for room ${roomId}`);
            socket.emit("error", { message: "Game not found" });
            return;
          }

          // Check if it's the player's turn
          if (String(gameState.currentTurn) !== String(socket.userId)) {
            console.error(`Not player's turn: ${socket.userId}`);
            socket.emit("error", { message: "Not your turn" });
            return;
          }

          // Prevent multiple power-ups per turn
          const currentPlayer = (gameState.players || []).find(
            (p) => String(p.userId) === String(socket.userId)
          );
          if (currentPlayer?.usedPowerUpThisTurn) {
            socket.emit("error", {
              message: "Power-up already used this turn",
            });
            return;
          }

          // Apply power-up effect
          const effectResult = await this.applyPowerUpEffect(
            gameState,
            socket.userId,
            powerUpId
          );

          // Mark usage for this turn
          if (currentPlayer) {
            currentPlayer.usedPowerUpThisTurn = true;
            // Clamp hand size defensively after any power-up resolution
            const MAX_HAND = 6;
            if (
              Array.isArray(currentPlayer.cards) &&
              currentPlayer.cards.length > MAX_HAND
            ) {
              currentPlayer.cards = currentPlayer.cards.slice(
                currentPlayer.cards.length - MAX_HAND
              );
            }
          }

          // Save updated game state
          await gameEngine.saveGameStateToDatabase(
            gameState,
            gameState.lobbyId
          );

          // Emit power-up events
          // For defensive traps, don't reveal the exact type to the room.
          const defensiveTypes = new Set([
            "mirror_shield",
            "barrier",
            "safety_net",
          ]);
          if (defensiveTypes.has(powerUpId)) {
            // Private ack to the user who armed it
            this.io.to(socket.userId).emit("powerup_armed", {
              playerId: socket.userId,
              name:
                powerUpId === "mirror_shield"
                  ? "Mirror Shield"
                  : powerUpId === "barrier"
                  ? "Barrier"
                  : "Safety Net",
            });
            // Optional vague hint to room (comment out to hide completely)
            // this.io.to(roomId).emit("powerup_armed_hint", { playerId: socket.userId });
          } else {
            // Non-defensive: broadcast normally
            this.io.to(roomId).emit("powerup_used", {
              playerId: socket.userId,
              powerUpId: powerUpId,
              effect: effectResult,
            });
          }

          // Send personalized game state to each player (preserve own cards, hide opponent cards)
          gameState.players.forEach((p) => {
            const personalizedState = {
              ...gameState,
              players: gameState.players.map((pl) => ({
                ...pl,
                cards:
                  String(pl.userId) === String(p.userId)
                    ? (pl.cards || []).map((c) => transformCardFromDatabase(c))
                    : [],
              })),
            };
            this.io.to(p.userId).emit("game_state_update", {
              gameState: personalizedState,
              timestamp: Date.now(),
            });
          });

          console.log(
            `✅ Power-up ${powerUpId} used successfully by ${socket.userId}`
          );
        } catch (error) {
          console.error("Error using power-up:", error);
          socket.emit("error", { message: "Failed to use power-up" });
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
              console.log(`Checking in-memory state for roomId ${roomId}:`, {
                hasMemState: !!memState,
                hasPlayers: !!(memState && memState.players),
                playersIsArray: !!(memState && Array.isArray(memState.players)),
                playersLength:
                  memState && memState.players ? memState.players.length : 0,
                players:
                  memState && memState.players
                    ? memState.players.map((p) => ({
                        userId: p.userId,
                        username: p.username,
                      }))
                    : [],
              });

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
                // Last resort: create players array from RPS participants
                console.log(
                  `Creating temporary players array from RPS participants`
                );
                const tempPlayers = playerIds.map((playerId, index) => ({
                  userId: playerId,
                  username: `Player ${index + 1}`,
                  hp: 100,
                  maxHp: 100,
                }));

                if (tempPlayers.length >= 2) {
                  playersArray = tempPlayers;
                  console.log(
                    `Using temporary players array:`,
                    playersArray.map((p) => ({
                      userId: p.userId,
                      username: p.username,
                    }))
                  );
                } else {
                  console.error(
                    `Unable to resolve players for roomId ${roomId}`
                  );
                  console.error(
                    `Available game states:`,
                    Object.keys(gameEngine.games || {})
                  );
                  socket.emit("error", { message: "Game room not found" });
                  return;
                }
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
            let winnerUserId = null;
            if (!rpsResult.isDraw) {
              if (rpsResult.winner === 0) {
                // Player 1 (first in playerIds array) wins
                winnerUserId = playerIds[0];
                actualWinner = player1GameIndex;
              } else {
                // Player 2 (second in playerIds array) wins
                winnerUserId = playerIds[1];
                actualWinner = player2GameIndex;
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
            console.log(
              `Winner userId: ${winnerUserId}, Winner game index: ${actualWinner}`
            );
            this.io.to(roomId).emit("rps_result", {
              player1Choice,
              player2Choice,
              winner: actualWinner, // index in playersArray (0 or 1)
              winnerUserId: winnerUserId, // Use the calculated winnerUserId
              playersUserIds, // [player at index 0 userId, player at index 1 userId]
              choicesByUserId, // { userId: choice }
              isDraw: rpsResult.isDraw,
            });

            console.log(`RPS result emitted successfully`);

            // Update authoritative game state so turns are enforced server-side
            if (!rpsResult.isDraw) {
              try {
                const memState = gameEngine.getGameState(roomId);
                if (memState && winnerUserId) {
                  memState.currentTurn = winnerUserId;
                  memState.gamePhase = "cardSelection";
                  memState.selectedCard = null;
                  console.log(
                    `Updated game state: currentTurn = ${winnerUserId}`
                  );
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

          // Remove from room tracking
          this.playerRooms.delete(socket.userId);

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

        // Do NOT delete playerRooms entry here; keep it for auto-rejoin on reconnect

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

  // Update player room mappings when a new game starts
  updatePlayerRoomMappings(roomId, players) {
    console.log(`🔄 Updating player room mappings for room ${roomId}`);
    players.forEach((player) => {
      this.playerRooms.set(player.userId, roomId);
      console.log(`📍 Player ${player.userId} mapped to room ${roomId}`);
    });
  }

  // Removed old game initialization methods - using gameEngine service instead

  // Game initialization is now handled by the gameEngine service
  // when the frontend calls /api/game/initialize

  // Create and complete PvP match record
  async createAndCompletePvPMatch(matchData) {
    try {
      const {
        roomId,
        gameId,
        player1Id,
        player2Id,
        winnerId,
        player1Score,
        player2Score,
        player1CorrectAnswers,
        player2CorrectAnswers,
        totalQuestions,
        matchDuration,
      } = matchData;

      // Create match record
      const match = new PvPMatch({
        player1: player1Id,
        player2: player2Id,
        winner: winnerId,
        player1Score,
        player2Score,
        player1CorrectAnswers,
        player2CorrectAnswers,
        totalQuestions,
        matchDuration,
        gameMode: "versus",
        roomId,
        gameId,
        status: "completed",
        completedAt: new Date(),
      });

      // Calculate points changes
      match.calculatePointsChange();

      // Update player PvP stars
      const [player1, player2] = await Promise.all([
        Student.findById(player1Id),
        Student.findById(player2Id),
      ]);

      if (player1 && player2) {
        // Initialize pvpStars if not exists
        if (player1.pvpStars === undefined) player1.pvpStars = 0;
        if (player2.pvpStars === undefined) player2.pvpStars = 0;

        // Update stars with bounds checking
        player1.pvpStars = Math.max(
          0,
          Math.min(500, player1.pvpStars + match.player1PointsChange)
        );
        player2.pvpStars = Math.max(
          0,
          Math.min(500, player2.pvpStars + match.player2PointsChange)
        );

        await Promise.all([player1.save(), player2.save()]);
      }

      await match.save();

      console.log(
        `📊 PvP match recorded: ${player1Id} vs ${player2Id}, Winner: ${winnerId}`
      );
      console.log(
        `⭐ Points: ${match.player1PointsChange} vs ${match.player2PointsChange}`
      );

      return match;
    } catch (error) {
      console.error("❌ Error creating PvP match:", error);
      throw error;
    }
  }
  // Apply power-up effects
  async applyPowerUpEffect(gameState, playerId, powerUpId) {
    const player = (gameState.players || []).find(
      (p) => String(p.userId) === String(playerId)
    );
    const opponent = (gameState.players || []).find(
      (p) => String(p.userId) !== String(playerId)
    );
    if (!player || !opponent) {
      console.error("❌ applyPowerUpEffect: player or opponent not found", {
        playerId,
        players: (gameState.players || []).map((p) => p.userId),
      });
      return { type: "error", message: "Player not found" };
    }

    console.log(
      `⚡ Applying power-up effect: ${powerUpId} for player ${playerId}`
    );

    // Defensive initialization for missing fields on older game states
    if (!Array.isArray(player.activePowerUps)) {
      player.activePowerUps = [];
    }
    if (typeof player.usedPowerUpThisTurn !== "boolean") {
      player.usedPowerUpThisTurn = false;
    }

    switch (powerUpId) {
      case "mirror_shield": {
        player.defenseTrap = {
          type: "mirror_shield",
          percent: 0.5,
          usesLeft: 1,
        };
        console.log(`🛡️ Mirror Shield armed for ${player.userId}`);
        return { type: "armed_defense", name: "Mirror Shield" };
      }
      case "barrier": {
        player.defenseTrap = {
          type: "barrier",
          absorb: 15,
          usesLeft: 1,
        };
        console.log(`🛡️ Barrier armed for ${player.userId}`);
        return { type: "armed_defense", name: "Barrier" };
      }
      case "safety_net": {
        player.defenseTrap = {
          type: "safety_net",
          usesLeft: 1,
        };
        console.log(`🛡️ Safety Net armed for ${player.userId}`);
        return { type: "armed_defense", name: "Safety Net" };
      }
      case "discard_draw_5": {
        const deck = gameState.deck || [];
        const hand = Array.isArray(player.cards) ? player.cards : [];

        if (hand.length > 0) {
          // Place discarded cards to the bottom (front) of deck
          deck.unshift(...hand.map((c) => ({ ...c })));
          player.cards = [];
        }

        let drawn = 0;
        const MAX_HAND = 6;
        while (deck.length > 0 && player.cards.length < MAX_HAND) {
          const newCard = deck.pop();
          player.cards.push(newCard);
          drawn++;
        }

        console.log(
          `🔄 Discard & Draw 5: ${player.name} now has ${player.cards.length} cards (deck: ${deck.length})`
        );
        return {
          type: "discard_draw",
          drawn,
          handSize: player.cards.length,
          deckSize: deck.length,
          message: `${player.name} discarded all cards and drew ${drawn} new cards!`,
        };
      }

      case "emoji_taunt": {
        // Cosmetic only: broadcast a taunt event to the room
        const payload = {
          playerId: playerId,
          emoji: "😜",
          message: `${player.name || "Player"} sent a taunt!`,
          durationMs: 3000,
        };
        this.io.to(gameState.roomId).emit("cosmetic:taunt", payload);
        console.log(`🎭 Emoji Taunt sent by ${playerId}`);
        return { type: "cosmetic", message: payload.message };
      }
      case "health_potion":
        const healAmount = 20;
        const oldHp = player.hp;
        player.hp = Math.min(player.hp + healAmount, player.maxHp);
        const actualHeal = player.hp - oldHp;
        console.log(
          `💚 Health Potion: ${player.name} healed ${actualHeal} HP (${oldHp} → ${player.hp})`
        );
        return {
          type: "heal",
          amount: actualHeal,
          newHp: player.hp,
          message: `${player.name} used Health Potion and restored ${actualHeal} HP!`,
        };

      // triple_damage removed per balance pass

      case "double_damage":
        player.activePowerUps.push({
          type: "damage_multiplier",
          multiplier: 2,
          usesLeft: 1,
        });
        console.log(
          `⚡ Double Damage: ${player.name} next attack will deal 2x damage`
        );
        return {
          type: "damage_multiplier",
          multiplier: 2,
          message: `${player.name} activated Double Damage! Next attack deals 2x damage!`,
        };

      case "damage_roulette":
        const damage = Math.floor(Math.random() * 15) + 1; // 1-15 damage
        const oldOpponentHp = opponent.hp;
        opponent.hp = Math.max(0, opponent.hp - damage);
        console.log(
          `🎲 Damage Roulette: ${damage} damage dealt to ${opponent.name} (${oldOpponentHp} → ${opponent.hp})`
        );
        return {
          type: "direct_damage",
          damage: damage,
          targetHp: opponent.hp,
          message: `${player.name} used Damage Roulette and dealt ${damage} damage to ${opponent.name}!`,
        };

      case "hp_swap":
        const playerOldHp = player.hp;
        const opponentOldHp = opponent.hp;
        player.hp = opponentOldHp;
        opponent.hp = playerOldHp;
        console.log(
          `🔄 HP Swap: ${player.name} (${playerOldHp} → ${player.hp}) swapped with ${opponent.name} (${opponentOldHp} → ${opponent.hp})`
        );
        return {
          type: "hp_swap",
          playerNewHp: player.hp,
          opponentNewHp: opponent.hp,
          message: `${player.name} swapped HP with ${opponent.name}!`,
        };

      default:
        console.error(`Unknown power-up: ${powerUpId}`);
        return {
          type: "error",
          message: "Unknown power-up effect",
        };
    }
  }
}

module.exports = GameServer;
