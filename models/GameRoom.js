const mongoose = require("mongoose");

const gameRoomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    gameId: {
      type: String,
      required: true,
      unique: true,
    },
    lobbyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lobby",
      required: true,
    },
    players: [
      {
        userId: {
          type: String,
          required: true,
        },
        username: {
          type: String,
          required: true,
        },
        hp: {
          type: Number,
          default: 100,
        },
        maxHp: {
          type: Number,
          default: 100,
        },
        cards: [
          {
            id: { type: String, required: true },
            type: { type: String, required: true }, // "question"
            // Question card fields (optional)
            question: { type: String, default: "" },
            choices: { type: [String], default: [] },
            answer: { type: String, default: "" },
            bloom_level: { type: String, default: "" },
            name: { type: String, default: "" },
            description: { type: String, default: "" },
            // Common fields
            icon: { type: String, default: "" },
            color: { type: String, default: "" },
            bgColor: { type: String, default: "" },
            // Additional fields
            damage: { type: Number, default: 0 },
          },
        ],
        correctAnswers: {
          type: Number,
          default: 0,
        },
      },
    ],
    currentTurn: {
      type: String,
      required: true,
    },
    gamePhase: {
      type: String,
      enum: ["cardSelection", "answering", "finished"],
      default: "cardSelection",
    },
    deck: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true },
        // Question card fields (optional)
        question: { type: String, default: "" },
        choices: { type: [String], default: [] },
        answer: { type: String, default: "" },
        bloom_level: { type: String, default: "" },
        name: { type: String, default: "" },
        description: { type: String, default: "" },
        // Common fields
        icon: { type: String, default: "" },
        color: { type: String, default: "" },
        bgColor: { type: String, default: "" },
        // Additional fields
        damage: { type: Number, default: 0 },
      },
    ],
    selectedCard: {
      id: { type: String, default: "" },
      type: { type: String, default: "" },
      // Question card fields (optional)
      question: { type: String, default: "" },
      choices: { type: [String], default: [] },
      answer: { type: String, default: "" },
      bloom_level: { type: String, default: "" },
      name: { type: String, default: "" },
      description: { type: String, default: "" },
      // Common fields
      icon: { type: String, default: "" },
      color: { type: String, default: "" },
      bgColor: { type: String, default: "" },
      // Additional fields
      damage: { type: Number, default: 0 },
    },
    gameState: {
      type: String,
      enum: ["waiting", "playing", "finished"],
      default: "waiting",
    },
    winner: {
      type: String,
      default: null,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    matchStartTime: {
      type: Number,
      default: Date.now,
    },
    matchDuration: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    },
  },
  {
    timestamps: true,
  }
);

// Index for performance
gameRoomSchema.index({ roomId: 1 });
gameRoomSchema.index({ gameId: 1 });
gameRoomSchema.index({ lobbyId: 1 });
gameRoomSchema.index({ "players.userId": 1 });
gameRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("GameRoom", gameRoomSchema);
