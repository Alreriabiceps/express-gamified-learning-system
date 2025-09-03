const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const messageController = require("../users/students/chats/controllers/messageController");
const Question = require("../users/admin/question/models/questionModels");
const gameEngine = require("../services/gameEngine");
const GameRoom = require("../models/GameRoom");
const PvPMatch = require("../users/students/pvp/models/pvpMatchModel");
const Student = require("../users/admin/student/models/studentModels");

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
                  cards: p.userId === player.userId ? p.cards : [],
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
            socket.emit("error", {
              message: "Failed to process card selection",
              error: error.message,
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

            // If game is over, create PvP match record
            if (result.gameState.gameState === "finished") {
              try {
                await this.createAndCompletePvPMatch({
                  roomId,
                  gameId,
                  player1Id: result.gameState.players[0].userId,
                  player2Id: result.gameState.players[1].userId,
                  winnerId: result.gameState.winner,
                  player1Score: result.gameState.players[0].hp,
                  player2Score: result.gameState.players[1].hp,
                });
              } catch (pvpError) {
                console.error("❌ Error creating PvP match record:", pvpError);
              }
            }

            console.log("✅ Answer processed and broadcasted");
          } catch (error) {
            console.error("❌ Error processing answer submission:", error);
            this.io.to(roomId).emit("game:error", {
              message: "Failed to process answer submission",
              roomId,
              gameId,
            });
          }
        }
      );

      // Join game room for real-time PvP
      socket.on("join_game_room", async ({ roomId }) => {
        try {
          console.log(`Player ${socket.userId} joining game room: ${roomId}`);

          // Join the socket room
          socket.join(roomId);

          // Get game state from database
          const gameRoom = await GameRoom.findOne({ roomId });
          if (gameRoom) {
            console.log(`📋 Found game state in database for room: ${roomId}`);

            // Store in memory for quick access
            gameEngine.games.set(roomId, gameRoom.toObject());

            const gameState = gameRoom.toObject();

            console.log(`📊 Game state found:`, {
              players: gameState.players?.length || 0,
              currentTurn: gameState.currentTurn,
              deck: gameState.deck?.length || 0,
              gamePhase: gameState.gamePhase,
            });

            // Broadcast updated game state to all players in room
            console.log(`🔄 Broadcasting game state to room: ${roomId}`);
            this.io.to(roomId).emit("game_state_update", {
              gameState: gameState,
              timestamp: Date.now(),
            });

            // Also send to this player's personal room as backup
            this.io.to(socket.userId).emit("game_state_update", {
              gameState: gameState,
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

            // Fallback: if both players are in the socket room, initialize the game server-side
            try {
              const room = this.io.sockets.adapter.rooms.get(roomId);
              const connectedCount = room ? room.size : 0;
              console.log(
                `🛟 Fallback initializer check for ${roomId} — connected players: ${connectedCount}`
              );

              if (room && connectedCount >= 2) {
                // Build players array from connected sockets (take first two)
                const playerSockets = Array.from(room.values())
                  .slice(0, 2)
                  .map((sid) => this.io.sockets.sockets.get(sid))
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

      // Removed use_powerup handler - not currently implemented in frontend

      // Removed activate_spell handler - not currently implemented in frontend

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
}

module.exports = GameServer;
