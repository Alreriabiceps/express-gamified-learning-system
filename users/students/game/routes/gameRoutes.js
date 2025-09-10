const express = require("express");
const router = express.Router();
const gameEngine = require("../../../../services/gameEngine");
const GameRoom = require("../../../../models/GameRoom");
const { verifyToken } = require("../../../../auth/authMiddleware");

// Clear all games (for testing purposes)
router.post("/clear-games", verifyToken, async (req, res) => {
  try {
    gameEngine.clearAllGames();
    res.json({ success: true, message: "All games cleared from memory" });
  } catch (error) {
    console.error("Error clearing games:", error);
    res.status(500).json({ success: false, error: "Failed to clear games" });
  }
});

// Initialize game from lobby
router.post("/initialize", verifyToken, async (req, res) => {
  try {
    console.log("🎮🎮🎮 GAME INITIALIZATION ROUTE HIT! 🎮🎮🎮");
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));
    console.log("🧑 User from token:", req.user);
    console.log("⏰ Timestamp:", new Date().toISOString());
    const { lobbyId, players, forceNew = false } = req.body;

    if (!lobbyId || !players || players.length !== 2) {
      console.log("Invalid game initialization data:", { lobbyId, players });
      return res.status(400).json({
        success: false,
        error: "Invalid game initialization data",
      });
    }

    // Serialize initialization per lobby to avoid double creation
    let roomId;
    let gameState;
    await gameEngine.withInitializationLock(lobbyId, async () => {
      // If forceNew is true, skip existing game checks and create a new one
      if (forceNew) {
        console.log("🆕 Force new game requested, creating fresh game...");
        roomId = `room_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        gameState = await gameEngine.initializeGame(roomId, players, lobbyId);
        return;
      }

      // First check in-memory
      const mappedRoom = gameEngine.getActiveRoomIdByLobbyId(lobbyId);
      if (mappedRoom) {
        console.log(
          "🔄 Active game found in-memory for lobby. Reusing room:",
          mappedRoom
        );
        console.log(
          "🃏 Existing game card counts:",
          gameEngine.getGameState(mappedRoom)?.players?.map((p) => ({
            name: p.name,
            userId: p.userId,
            cardCount: p.cards?.length || 0,
          }))
        );
        roomId = mappedRoom;
        gameState = gameEngine.getGameState(mappedRoom);
        return;
      }

      // Check database as fallback
      const existingRoom = await GameRoom.findOne({
        lobbyId,
        gameState: { $ne: "finished" },
      }).lean();
      if (existingRoom) {
        console.log(
          "Active game already exists for lobby (DB). Reusing room:",
          existingRoom.roomId
        );
        roomId = existingRoom.roomId;
        gameState = existingRoom;
        if (!gameEngine.getGameState(roomId)) {
          gameEngine.games.set(roomId, existingRoom);
        }
        return;
      }

      // Otherwise, create a new game/room
      roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      gameState = await gameEngine.initializeGame(roomId, players, lobbyId);
    });

    const responseData = {
      success: true,
      data: {
        roomId,
        gameState,
      },
    };

    // Send response to the initializing player
    res.json(responseData);

    // Also broadcast the game initialization data to all players in the lobby
    // so the second player can receive it via socket
    const io = req.app.get("io");
    if (io) {
      console.log(`=== BROADCASTING GAME INITIALIZATION ===`);
      console.log(`Lobby ID: ${lobbyId}`);
      console.log(`Room ID: ${roomId}`);
      console.log(
        `Players to notify:`,
        players.map((p) => ({ userId: p.userId, username: p.username }))
      );
      console.log(`Game data being broadcast:`, {
        success: responseData.success,
        roomId: responseData.data.roomId,
        gameId: responseData.data.gameState.gameId,
      });

      // Update player room mappings for the new game
      const gameServer = req.app.get("gameServer");
      if (gameServer && gameServer.updatePlayerRoomMappings) {
        gameServer.updatePlayerRoomMappings(roomId, players);
      }

      // Target only the players in this specific game
      players.forEach((player) => {
        console.log(`📡 Emitting game:initialized to player ${player.userId}`);
        io.to(player.userId).emit("game:initialized", responseData);
      });

      // Broadcast game state update to all players first
      console.log("🔄 Broadcasting game state update to players...");
      console.log("📊 Game state being sent:", {
        currentTurn: gameState.currentTurn,
        players: gameState.players?.length || 0,
        deck: gameState.deck?.length || 0,
        gamePhase: gameState.gamePhase,
      });

      players.forEach((player) => {
        console.log(`📡 Emitting game_state_update to player ${player.userId}`);
        io.to(player.userId).emit("game_state_update", {
          gameState: gameState,
        });
      });

      // Proactively request clients to join the socket room
      players.forEach((player) => {
        io.to(player.userId).emit("server:request_join_room", { roomId });
      });

      // Broadcast coin flip result to all players (only once per game)
      if (
        gameState &&
        gameState.currentTurn &&
        gameState.players.length === 2 &&
        !gameState.coinFlipSent // Prevent duplicate coin flip events
      ) {
        const winner = gameState.players.find(
          (p) => p.userId === gameState.currentTurn
        );
        const loser = gameState.players.find(
          (p) => p.userId !== gameState.currentTurn
        );

        if (winner && loser) {
          const winnerName = winner.username || winner.name || "Player";
          const loserName = loser.username || loser.name || "Player";

          const coinFlipData = {
            winner: { name: winnerName, userId: winner.userId },
            loser: { name: loserName, userId: loser.userId },
            message: `🪙 ${winnerName} won the coin toss and goes first!`,
            timestamp: Date.now(),
          };

          console.log(
            `🪙 Broadcasting coin flip result:`,
            coinFlipData.message
          );
          console.log(`Winner data:`, {
            username: winner.username,
            name: winner.name,
            userId: winner.userId,
          });
          console.log(`Loser data:`, {
            username: loser.username,
            name: loser.name,
            userId: loser.userId,
          });

          // Mark coin flip as sent to prevent duplicates
          gameState.coinFlipSent = true;
          gameEngine.games.set(roomId, gameState);

          // Send to all players in this game with a slight delay to ensure game is loaded
          setTimeout(() => {
            players.forEach((player) => {
              // Personalize message for each player
              const isWinner = player.userId === winner.userId;
              const personalizedData = {
                ...coinFlipData,
                isWinner: isWinner,
                message: isWinner
                  ? `🪙 You won the coin toss and go first!`
                  : `🪙 ${winnerName} won the coin toss and goes first!`,
              };

              console.log(
                `📡 Emitting coin_flip_result to player ${player.userId} (isWinner: ${isWinner})`
              );
              io.to(player.userId).emit("coin_flip_result", personalizedData);
            });
          }, 1500); // 1.5 second delay to ensure game UI is ready
        }
      }

      // Retry check: ensure both players join the room within a few seconds
      let attempts = 0;
      const maxAttempts = 6; // ~6 seconds
      const interval = setInterval(() => {
        attempts += 1;
        const room = io.sockets.adapter.rooms.get(roomId);
        if (room) {
          console.log(
            `✅ Room ${roomId} has ${room.size} connected players (attempt ${attempts})`
          );
          if (room.size >= 2 || attempts >= maxAttempts) {
            clearInterval(interval);
          }
        } else {
          console.log(
            `❌ Room ${roomId} not found or empty (attempt ${attempts})`
          );
          // Re-request join for any player who may have missed it
          players.forEach((player) => {
            io.to(player.userId).emit("server:request_join_room", { roomId });
          });
          if (attempts >= maxAttempts) {
            clearInterval(interval);
          }
        }
      }, 1000);

      console.log(`=== END BROADCAST ===`);
    }
  } catch (error) {
    console.error("Error initializing game:", error);
    res.status(500).json({
      success: false,
      error: "Failed to initialize game",
      message: error?.message,
      code: error?.code,
    });
  }
});

// Get game state
router.get("/state/:roomId", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;

    const gameRoom = await GameRoom.findOne({ roomId });

    if (!gameRoom) {
      return res.status(404).json({
        success: false,
        error: "Game not found",
      });
    }

    // Transform the game state to frontend format
    const {
      transformCardFromDatabase,
    } = require("../../../services/utils/gameUtils");

    const transformedGameState = {
      ...gameRoom.toObject(),
      players: gameRoom.players.map((player) => ({
        ...player.toObject(),
        cards: player.cards.map(transformCardFromDatabase),
      })),
      deck: gameRoom.deck.map(transformCardFromDatabase),
    };

    res.json({
      success: true,
      data: transformedGameState,
    });
  } catch (error) {
    console.error("Error getting game state:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get game state",
    });
  }
});

// Debug endpoint to check all game rooms
router.get("/debug/rooms", verifyToken, async (req, res) => {
  try {
    const rooms = await GameRoom.find({})
      .select("roomId gameId gameState players.hp players.cards")
      .lean();
    res.json({
      success: true,
      data: {
        totalRooms: rooms.length,
        rooms: rooms.map((room) => ({
          roomId: room.roomId,
          gameId: room.gameId,
          gameState: room.gameState,
          players: room.players.map((p) => ({
            userId: p.userId,
            hp: p.hp,
            cardsCount: p.cards?.length || 0,
          })),
        })),
      },
    });
  } catch (error) {
    console.error("Error getting debug rooms:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get debug rooms",
    });
  }
});

// Clean up game
router.delete("/:roomId", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;

    await gameEngine.cleanupGame(roomId);

    res.json({
      success: true,
      message: "Game cleaned up successfully",
    });
  } catch (error) {
    console.error("Error cleaning up game:", error);
    res.status(500).json({
      success: false,
      error: "Failed to clean up game",
    });
  }
});

module.exports = router;
