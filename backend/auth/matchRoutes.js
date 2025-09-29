const express = require("express");
const router = express.Router();
const matchQueue = require("../services/matchQueue");
const Lobby = require("../users/students/lobby/models/lobbyModel");

// Add to queue
router.post("/queue", async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId)
      return res.status(400).json({ error: "studentId required" });
    const result = await matchQueue.addToQueue(studentId);
    res.json(result);
  } catch (error) {
    console.error("❌ Error adding to queue:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove from queue
router.post("/cancel", (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId)
      return res.status(400).json({ error: "studentId required" });
    matchQueue.removeFromQueue(studentId);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error removing from queue:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get match status
router.get("/status", (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId)
      return res.status(400).json({ error: "studentId required" });
    const result = matchQueue.getMatchStatus(studentId);
    res.json(result);
  } catch (error) {
    console.error("❌ Error getting match status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Accept match
router.post("/accept", async (req, res) => {
  try {
    const { studentId, lobbyId, timeout } = req.body;
    if (!studentId || !lobbyId)
      return res.status(400).json({ error: "studentId and lobbyId required" });
    if (timeout) {
      matchQueue.setBan(studentId);
      matchQueue.removeFromQueue(studentId);
      return res.json({ banned: true, ban: matchQueue.getBan(studentId) });
    }
    matchQueue.setAccept(lobbyId, studentId);
    const accepts = matchQueue.getAccept(lobbyId);

    // If both accepted, create lobby and emit match_ready event
    if (
      Object.keys(accepts).length >= 2 &&
      Object.values(accepts).every(Boolean)
    ) {
      // Get the opponent's ID from the lobby
      const lobbyAccepts = matchQueue.getAccept(lobbyId);
      const playerIds = Object.keys(lobbyAccepts);

      if (playerIds.length >= 2) {
        const [player1Id, player2Id] = playerIds;

        try {
          // Create a lobby in the database with populated player data
          console.log(
            "🏗️ Creating lobby for quick match with players:",
            playerIds
          );

          const lobby = new Lobby({
            name: "Quick Match",
            hostId: player1Id,
            isPrivate: false,
            players: playerIds,
            status: "in-progress", // Set to in-progress since both players are already matched
            maxPlayers: 2,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          });

          const savedLobby = await lobby.save();
          console.log("✅ Lobby created for quick match:", savedLobby._id);

          // Populate the lobby with player data and emit game:start
          await savedLobby.populate("players", "firstName lastName");
          console.log("🎮 Populated lobby players:", savedLobby.players);

          // Emit game:start event directly since lobby is already full
          const io = req.app.get("io");
          if (io) {
            // Format players data properly for the frontend
            const formattedPlayers = savedLobby.players.map((player) => {
              return {
                userId: player._id.toString(),
                name:
                  player.firstName && player.lastName
                    ? `${player.firstName} ${player.lastName}`
                    : player.firstName || player.lastName || "Player",
                username:
                  player.firstName && player.lastName
                    ? `${player.firstName} ${player.lastName}`
                    : player.firstName || player.lastName || "Player",
                firstName: player.firstName,
                lastName: player.lastName,
              };
            });

            console.log(
              "🎮 Formatted players for quick match game:start:",
              formattedPlayers
            );

            // Send the same player data to all players
            savedLobby.players.forEach((player) => {
              const playerId = player._id.toString();
              console.log(`🎮 Emitting game:start to player ${playerId}`);
              io.to(playerId).emit("game:start", {
                lobbyId: savedLobby._id,
                players: formattedPlayers,
              });
            });

            // Initialize the game in the gameEngine
            const gameEngine = require("../services/gameEngine");
            const roomId = `room_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 8)}`;

            console.log(
              "🎮 Initializing game for quick match with roomId:",
              roomId
            );

            // Initialize the game with the formatted players
            gameEngine
              .initializeGame(
                roomId,
                formattedPlayers,
                savedLobby._id.toString()
              )
              .then(() => {
                console.log("✅ Game initialized successfully for quick match");
              })
              .catch((error) => {
                console.error(
                  "❌ Error initializing game for quick match:",
                  error
                );
              });
          }

          // Update the lobbyId in the matchQueue to use the database lobby ID
          const dbLobbyId = savedLobby._id.toString();

          return res.json({ ready: true, lobbyId: dbLobbyId });
        } catch (error) {
          console.error("❌ Error creating lobby for quick match:", error);
          // Fallback to original behavior
          await matchQueue.emitMatchReady(player1Id, player2Id, lobbyId);
          return res.json({ ready: true });
        }
      }

      return res.json({ ready: true });
    }
    res.json({ accepted: true });
  } catch (error) {
    console.error("❌ Error accepting match:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get ban status
router.get("/ban-status", (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId)
      return res.status(400).json({ error: "studentId required" });
    const ban = matchQueue.getBan(studentId);
    if (ban) return res.json({ banned: true, ban });
    res.json({ banned: false });
  } catch (error) {
    console.error("❌ Error getting ban status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
