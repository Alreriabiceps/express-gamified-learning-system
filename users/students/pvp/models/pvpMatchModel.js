const mongoose = require("mongoose");

const pvpMatchSchema = new mongoose.Schema(
  {
    // Match participants
    player1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    player2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // Match result
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
    loser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },

    // Scores and performance
    player1Score: {
      type: Number,
      default: 0,
    },
    player2Score: {
      type: Number,
      default: 0,
    },
    player1CorrectAnswers: {
      type: Number,
      default: 0,
    },
    player2CorrectAnswers: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },

    // Points system (fixed ±8 stars)
    player1PointsChange: {
      type: Number,
      default: 0, // +8 for win, -8 for loss
    },
    player2PointsChange: {
      type: Number,
      default: 0, // +8 for win, -8 for loss
    },

    // Match metadata
    matchDuration: {
      type: Number, // in seconds
      default: 0,
    },
    gameMode: {
      type: String,
      enum: ["versus", "demo"],
      default: "versus",
    },
    roomId: {
      type: String,
      required: true,
    },
    gameId: {
      type: String,
      required: true,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["in-progress", "completed", "abandoned"],
      default: "in-progress",
    },

    // Timestamps
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent self-matches
pvpMatchSchema.pre("save", function (next) {
  if (this.player1.toString() === this.player2.toString()) {
    next(new Error("Cannot match against yourself"));
  }
  next();
});

// Indexes for performance
pvpMatchSchema.index({ player1: 1, createdAt: -1 });
pvpMatchSchema.index({ player2: 1, createdAt: -1 });
pvpMatchSchema.index({ winner: 1, createdAt: -1 });
pvpMatchSchema.index({ roomId: 1 });
pvpMatchSchema.index({ gameId: 1 });
pvpMatchSchema.index({ status: 1, createdAt: -1 });

// Virtual for match result
pvpMatchSchema.virtual("result").get(function () {
  if (!this.winner) return "incomplete";
  return this.winner.toString() === this.player1.toString()
    ? "player1_wins"
    : "player2_wins";
});

// Method to calculate points change
pvpMatchSchema.methods.calculatePointsChange = function () {
  if (!this.winner) return;

  // Fixed ±8 stars system
  const POINTS_WIN = 8;
  const POINTS_LOSS = -8;

  if (this.winner.toString() === this.player1.toString()) {
    this.player1PointsChange = POINTS_WIN;
    this.player2PointsChange = POINTS_LOSS;
    this.loser = this.player2;
  } else {
    this.player1PointsChange = POINTS_LOSS;
    this.player2PointsChange = POINTS_WIN;
    this.loser = this.player1;
  }
};

// Method to get player's performance in this match
pvpMatchSchema.methods.getPlayerPerformance = function (playerId) {
  const isPlayer1 = this.player1.toString() === playerId.toString();

  return {
    score: isPlayer1 ? this.player1Score : this.player2Score,
    correctAnswers: isPlayer1
      ? this.player1CorrectAnswers
      : this.player2CorrectAnswers,
    pointsChange: isPlayer1
      ? this.player1PointsChange
      : this.player2PointsChange,
    won: this.winner && this.winner.toString() === playerId.toString(),
    opponent: isPlayer1 ? this.player2 : this.player1,
  };
};

module.exports = mongoose.model("PvPMatch", pvpMatchSchema);


