const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../../../auth/authMiddleware");
const lobbyController = require("../controllers/lobbyController");

// Create a new lobby
router.post("/", verifyToken, lobbyController.createLobby);

// Get all lobbies
router.get("/", verifyToken, lobbyController.getLobbies);

// Get user's created lobby (requires auth because controller uses req.user)
router.get("/my-lobby", verifyToken, lobbyController.getMyLobby);

// Join a lobby
router.post("/:lobbyId/join", verifyToken, lobbyController.joinLobby);

// Leave a lobby (either as player or host)
router.post("/:lobbyId/leave", verifyToken, async (req, res) => {
  try {
    const { lobbyId } = req.params;
    const userId = req.user.id;
    const lobby = await require("../models/lobbyModel").findById(lobbyId);
    if (!lobby)
      return res.status(404).json({ success: false, error: "Lobby not found" });
    const isHost = lobby.hostId.toString() === userId;
    if (isHost) {
      await lobby.deleteOne();
      require("../../../../services/socketService").emitEvent("lobby:deleted", {
        lobbyId,
      });
      return res.json({ success: true, message: "Lobby deleted" });
    }
    const before = lobby.players.length;
    lobby.players = lobby.players.filter((p) => p.toString() !== userId);
    if (lobby.players.length !== before) {
      await lobby.save();
      require("../../../../services/socketService").emitEvent(
        "lobby:updated",
        lobby
      );
    }
    return res.json({ success: true, data: lobby });
  } catch (e) {
    console.error("leave lobby error", e);
    res.status(500).json({ success: false, error: "Failed to leave lobby" });
  }
});

// Delete a lobby
router.delete("/:lobbyId", verifyToken, lobbyController.deleteLobby);

module.exports = router;
