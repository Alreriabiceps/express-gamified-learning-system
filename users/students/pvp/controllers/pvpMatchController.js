const PvPMatch = require("../models/pvpMatchModel");
const Student = require("../../../../users/admin/student/models/studentModels");

// Create a new PvP match
exports.createMatch = async (req, res) => {
  try {
    const {
      player1Id,
      player2Id,
      roomId,
      gameId,
      gameMode = "versus",
    } = req.body;

    // Validate players exist
    const [player1, player2] = await Promise.all([
      Student.findById(player1Id),
      Student.findById(player2Id),
    ]);

    if (!player1 || !player2) {
      return res.status(404).json({
        success: false,
        message: "One or both players not found",
      });
    }

    // Create match
    const match = new PvPMatch({
      player1: player1Id,
      player2: player2Id,
      roomId,
      gameId,
      gameMode,
    });

    await match.save();
    await match.populate("player1 player2", "firstName lastName pvpStars");

    res.status(201).json({
      success: true,
      data: match,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Complete a PvP match and update player stats
exports.completeMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const {
      winnerId,
      player1Score,
      player2Score,
      player1CorrectAnswers,
      player2CorrectAnswers,
      totalQuestions,
      matchDuration,
    } = req.body;

    // Find the match
    const match = await PvPMatch.findById(matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    if (match.status !== "in-progress") {
      return res.status(400).json({
        success: false,
        message: "Match is not in progress",
      });
    }

    // Update match data
    match.winner = winnerId;
    match.player1Score = player1Score;
    match.player2Score = player2Score;
    match.player1CorrectAnswers = player1CorrectAnswers;
    match.player2CorrectAnswers = player2CorrectAnswers;
    match.totalQuestions = totalQuestions;
    match.matchDuration = matchDuration;
    match.status = "completed";
    match.completedAt = new Date();

    // Calculate points changes
    match.calculatePointsChange();

    // Update player PvP stars
    const [player1, player2] = await Promise.all([
      Student.findById(match.player1),
      Student.findById(match.player2),
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
    await match.populate(
      "player1 player2 winner loser",
      "firstName lastName pvpStars"
    );

    res.json({
      success: true,
      data: match,
      message: "Match completed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get player's match history (last 3 days by default)
exports.getPlayerMatches = async (req, res) => {
  try {
    const { playerId } = req.params;
    const { days = 3, limit = 50 } = req.query;

    console.log(
      `🔍 Fetching PvP matches for player ${playerId}, days: ${days}, limit: ${limit}`
    );

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const matches = await PvPMatch.find({
      $or: [{ player1: playerId }, { player2: playerId }],
      status: "completed",
      completedAt: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate("player1 player2 winner loser", "firstName lastName pvpStars")
      .sort({ completedAt: -1 })
      .limit(parseInt(limit));

    console.log(
      `📊 Found ${matches.length} PvP matches for player ${playerId}`
    );

    // Transform matches to include player performance
    const transformedMatches = matches.map((match) => {
      const isPlayer1 = match.player1._id.toString() === playerId;
      const opponent = isPlayer1 ? match.player2 : match.player1;
      const won = match.winner && match.winner._id.toString() === playerId;

      return {
        id: match._id,
        date: match.completedAt,
        opponent: {
          firstName: opponent.firstName,
          lastName: opponent.lastName,
        },
        result: won ? "win" : "loss",
        myScore: isPlayer1 ? match.player1Score : match.player2Score,
        opponentScore: isPlayer1 ? match.player2Score : match.player1Score,
        pointsChange: isPlayer1
          ? match.player1PointsChange
          : match.player2PointsChange,
        correctAnswers: isPlayer1
          ? match.player1CorrectAnswers
          : match.player2CorrectAnswers,
        totalQuestions: match.totalQuestions,
        matchDuration: match.matchDuration,
        gameMode: match.gameMode,
      };
    });

    console.log(
      `✅ Transformed ${transformedMatches.length} matches for API response`
    );

    res.json({
      success: true,
      data: {
        matches: transformedMatches,
        totalMatches: matches.length,
        dateRange: { startDate, endDate },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching player matches:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get PvP leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const leaderboard = await Student.find({
      pvpStars: { $exists: true },
    })
      .select("firstName lastName pvpStars")
      .sort({ pvpStars: -1 })
      .limit(parseInt(limit));

    // Add rank to each player
    const rankedLeaderboard = leaderboard.map((player, index) => ({
      rank: index + 1,
      studentId: player._id,
      name: `${player.firstName} ${player.lastName}`,
      pvpStars: player.pvpStars || 0,
    }));

    res.json({
      success: true,
      data: {
        leaderboard: rankedLeaderboard,
        totalPlayers: leaderboard.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get player's PvP statistics
exports.getPlayerStats = async (req, res) => {
  try {
    const { playerId } = req.params;

    // Get player info
    const player = await Student.findById(playerId).select(
      "firstName lastName pvpStars"
    );
    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    // Get match statistics
    const totalMatches = await PvPMatch.countDocuments({
      $or: [{ player1: playerId }, { player2: playerId }],
      status: "completed",
    });

    const wins = await PvPMatch.countDocuments({
      winner: playerId,
      status: "completed",
    });

    const losses = totalMatches - wins;
    const winRate =
      totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;

    // Get recent performance (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMatches = await PvPMatch.countDocuments({
      $or: [{ player1: playerId }, { player2: playerId }],
      status: "completed",
      completedAt: { $gte: weekAgo },
    });

    const recentWins = await PvPMatch.countDocuments({
      winner: playerId,
      status: "completed",
      completedAt: { $gte: weekAgo },
    });

    res.json({
      success: true,
      data: {
        player: {
          id: player._id,
          name: `${player.firstName} ${player.lastName}`,
          pvpStars: player.pvpStars || 0,
        },
        stats: {
          totalMatches,
          wins,
          losses,
          winRate: parseFloat(winRate),
          recentMatches,
          recentWins,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get match by room ID (for real-time game integration)
exports.getMatchByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const match = await PvPMatch.findOne({ roomId }).populate(
      "player1 player2",
      "firstName lastName pvpStars"
    );

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    res.json({
      success: true,
      data: match,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
