const express = require("express");
const router = express.Router();
const gameEngine = require("../../../../services/gameEngine");
const GameRoom = require("../../../../models/GameRoom");
const { verifyToken } = require("../../../../auth/authMiddleware");

// Initialize game from lobby
router.post("/initialize", verifyToken, async (req, res) => {
  try {
    console.log("🎮🎮🎮 GAME INITIALIZATION ROUTE HIT! 🎮🎮🎮");
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));
    console.log("🧑 User from token:", req.user);
    console.log("⏰ Timestamp:", new Date().toISOString());
    const { lobbyId, players } = req.body;

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
      // First check in-memory
      const mappedRoom = gameEngine.getActiveRoomIdByLobbyId(lobbyId);
      if (mappedRoom) {
        console.log(
          "Active game found in-memory for lobby. Reusing room:",
          mappedRoom
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

      // Broadcast coin flip result to all players
      if (
        gameState &&
        gameState.currentTurn &&
        gameState.players.length === 2
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

      // Add a slight delay and then check if both players are in the same room
      setTimeout(() => {
        console.log(`🔍 Checking room membership for ${roomId}...`);
        const room = io.sockets.adapter.rooms.get(roomId);
        if (room) {
          console.log(`✅ Room ${roomId} has ${room.size} connected players`);
        } else {
          console.log(`❌ Room ${roomId} not found or empty`);
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

    res.json({
      success: true,
      data: gameRoom,
    });
  } catch (error) {
    console.error("Error getting game state:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get game state",
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
