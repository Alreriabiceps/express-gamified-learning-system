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
            id: String,
            type: String, // "question" or "spell"
            question: String,
            choices: [String],
            answer: String,
            bloom_level: String,
            spell_type: String,
            name: String,
            description: String,
            icon: String,
            color: String,
            bgColor: String,
          },
        ],
        powerUps: {
          double_damage: { available: Boolean, used: Boolean },
          shield: { available: Boolean, used: Boolean },
          hint_reveal: { available: Boolean, used: Boolean },
          extra_turn: { available: Boolean, used: Boolean },
          card_draw: { available: Boolean, used: Boolean },
          fifty_fifty: { available: Boolean, used: Boolean },
        },
        activatedSpells: [
          {
            id: String,
            spell_type: String,
            name: String,
            description: String,
            icon: String,
            color: String,
            bgColor: String,
            type: String,
          },
        ],
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
        id: String,
        type: String,
        question: String,
        choices: [String],
        answer: String,
        bloom_level: String,
        spell_type: String,
        name: String,
        description: String,
        icon: String,
        color: String,
        bgColor: String,
      },
    ],
    selectedCard: {
      id: String,
      type: String,
      question: String,
      choices: [String],
      answer: String,
      bloom_level: String,
      spell_type: String,
      name: String,
      description: String,
      icon: String,
      color: String,
      bgColor: String,
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
    powerUpEffects: {
      doubleDamage: { type: Boolean, default: false },
      shield: { type: Boolean, default: false },
      hintReveal: { type: Boolean, default: false },
      extraTurn: { type: Boolean, default: false },
      fiftyFifty: { type: Boolean, default: false },
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
