const Lobby = require("../models/lobbyModel");
const Student = require("../../../../users/admin/student/models/studentModels");
const socketService = require("../../../../services/socketService");

// Cleanup function to remove expired lobbies
const cleanupExpiredLobbies = async () => {
  try {
    await Lobby.cleanupExpiredLobbies();
  } catch (error) {
    console.error("Error in cleanup task:", error);
  }
};
setInterval(cleanupExpiredLobbies, 60 * 1000);

exports.createLobby = async (req, res) => {
  try {
    const { name, isPrivate, password } = req.body;
    const userId = req.user.id;
    const existingLobby = await Lobby.findOne({
      $or: [
        { hostId: userId, status: "waiting" },
        { players: userId, status: "waiting" },
      ],
    });
    if (existingLobby) {
      return res.status(400).json({
        success: false,
        error:
          "You already have an active lobby. Please wait for it to expire before creating a new one.",
      });
    }
    if (isPrivate && !password) {
      return res.status(400).json({
        success: false,
        error: "Password is required for private lobbies",
      });
    }
    const lobby = new Lobby({
      name: name || "Open Lobby",
      hostId: userId,
      isPrivate,
      password: isPrivate ? password : undefined,
      players: [userId],
      status: "waiting",
      expiresAt: new Date(Date.now() + 3 * 60 * 1000),
    });
    await lobby.save();
    await lobby.populate("hostId", "firstName lastName");
    await lobby.populate("players", "firstName lastName");
    socketService.emitEvent("lobby:created", lobby);
    return res.status(201).json({
      success: true,
      data: lobby,
    });
  } catch (error) {
    console.error("Error creating lobby:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to save lobby",
    });
  }
};

exports.getLobbies = async (req, res) => {
  try {
    const lobbies = await Lobby.find({
      status: "waiting",
      $or: [{ isPrivate: true }, { expiresAt: { $gt: new Date() } }],
    })
      .populate("hostId", "firstName lastName")
      .populate("players", "firstName lastName");
    res.status(200).json({
      success: true,
      data: lobbies,
    });
  } catch (error) {
    console.error("Error fetching lobbies:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch lobbies",
    });
  }
};

exports.joinLobby = async (req, res) => {
  try {
    console.log("🚪 JOIN LOBBY REQUEST RECEIVED!");
    console.log("👤 User ID:", req.user.id);
    console.log("🏠 Lobby ID:", req.params.lobbyId);
    console.log("🔐 Password provided:", !!req.body.password);

    const { lobbyId } = req.params;
    const { password } = req.body;
    const userId = req.user.id;
    const userInLobby = await Lobby.findOne({
      $or: [
        { hostId: userId, status: "waiting" },
        { players: userId, status: "waiting" },
      ],
    });
    if (userInLobby) {
      return res.status(400).json({
        success: false,
        error: "You already have an active lobby",
      });
    }
    const lobby = await Lobby.findById(lobbyId)
      .populate("hostId", "firstName lastName")
      .populate("players", "firstName lastName");
    if (!lobby) {
      return res.status(404).json({
        success: false,
        error: "Lobby not found",
      });
    }
    if (lobby.hostId._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        error: "You cannot join your own lobby",
      });
    }
    if (lobby.status !== "waiting") {
      return res.status(400).json({
        success: false,
        error: "Lobby is not available for joining",
      });
    }
    if (lobby.players.length >= lobby.maxPlayers) {
      return res.status(400).json({
        success: false,
        error: "Lobby is full",
      });
    }
    if (lobby.isPrivate && lobby.password !== password) {
      return res.status(401).json({
        success: false,
        error: "Invalid password",
      });
    }
    lobby.players.push(userId);
    console.log("🏠 LOBBY AFTER PLAYER JOIN:");
    console.log("👥 Players count:", lobby.players.length);
    console.log("🎯 Max players:", lobby.maxPlayers);
    console.log("📊 Current status:", lobby.status);

    if (lobby.players.length === lobby.maxPlayers) {
      console.log("🚀 LOBBY IS FULL! Setting status to in-progress");
      lobby.status = "in-progress";
      // Don't create game here - let the frontend handle game initialization
      // when it receives the game:start event
    } else {
      console.log(
        "⏳ Lobby not full yet, need",
        lobby.maxPlayers - lobby.players.length,
        "more players"
      );
    }
    await lobby.save();
    await lobby.populate("players", "firstName lastName");
    socketService.emitEvent("lobby:updated", lobby);
    if (lobby.status === "in-progress") {
      const io = req.app.get("io");
      if (io) {
        setTimeout(() => {
          console.log(
            "[LobbyController] Emitting game:start with players:",
            lobby.players
          );
          console.log("🔍 Detailed player data for game:start:", {
            playersCount: lobby.players.length,
            players: lobby.players.map((p) => ({
              _id: p._id,
              firstName: p.firstName,
              lastName: p.lastName,
              type: typeof p,
              keys: typeof p === "object" ? Object.keys(p) : "N/A",
            })),
          });
          // Format players data properly for the frontend
          const formattedPlayers = lobby.players.map((player) => {
            // Handle both populated and unpopulated player data
            if (player._id && typeof player === "object") {
              // Populated player data from populate("players", "firstName lastName")
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
            } else {
              // Unpopulated player data (just ObjectId)
              return {
                userId: player.toString(),
                name: "Player",
                username: "Player",
              };
            }
          });

          console.log("🎮 Formatted players for game:start:", formattedPlayers);

          // Send the same player data to all players (frontend will handle the logic)
          lobby.players.forEach((player) => {
            const playerId = player._id
              ? player._id.toString()
              : player.toString();
            console.log(`🎮 Emitting game:start to player ${playerId}`);
            io.to(playerId).emit("game:start", {
              lobbyId: lobby._id,
              players: formattedPlayers,
            });
          });
          console.log(
            "[LobbyController] Emitted game:start for lobby:",
            lobby._id.toString()
          );
        }, 100);
      } else {
        console.error("Socket.io instance not found on app!");
      }
    }
    return res.status(200).json({
      success: true,
      data: lobby,
    });
  } catch (error) {
    console.error("Error joining lobby:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to join lobby",
    });
  }
};

exports.getMyLobby = async (req, res) => {
  try {
    const userId = req.user.id;
    // Return a lobby where the user is either the host or already a player
    const lobby = await Lobby.findOne({
      $and: [
        {
          $or: [{ hostId: userId }, { players: userId }],
        },
        { status: { $in: ["waiting", "in-progress"] } },
        { expiresAt: { $gt: new Date() } },
      ],
    })
      .populate("hostId", "firstName lastName")
      .populate("players", "firstName lastName");

    if (!lobby) {
      // Return 200 with null data to avoid noisy 404s in client
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: lobby,
    });
  } catch (error) {
    console.error("Error fetching user's lobby:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch user's lobby",
    });
  }
};

exports.deleteLobby = async (req, res) => {
  try {
    const { lobbyId } = req.params;
    const userId = req.user.id;
    const lobby = await Lobby.findById(lobbyId);
    if (!lobby) {
      return res.status(404).json({
        success: false,
        error: "Lobby not found",
      });
    }
    if (lobby.hostId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only the lobby host can delete this lobby",
      });
    }
    await lobby.deleteOne();
    socketService.emitEvent("lobby:deleted", { lobbyId: lobby._id });
    return res.status(200).json({
      success: true,
      message: "Lobby deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting lobby:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete lobby",
    });
  }
};
