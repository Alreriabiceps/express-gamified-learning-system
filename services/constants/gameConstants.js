// Game Configuration Constants
const GAME_CONFIG = {
  INITIAL_HP: 100,
  INITIAL_CARDS: 5,
  DECK_SIZE_LIMIT: 20,
  MAX_PLAYERS: 2,
};

// Bloom's Taxonomy Configuration
const BLOOM_CONFIG = {
  Remembering: {
    damage: 5,
    color: "#9ca3af",
    bgColor: "rgba(156, 163, 175, 0.2)",
  },
  Understanding: {
    damage: 10,
    color: "#60a5fa",
    bgColor: "rgba(96, 165, 250, 0.2)",
  },
  Applying: {
    damage: 15,
    color: "#34d399",
    bgColor: "rgba(52, 211, 153, 0.2)",
  },
  Analyzing: {
    damage: 20,
    color: "#fb923c",
    bgColor: "rgba(251, 146, 60, 0.2)",
  },
  Evaluating: {
    damage: 25,
    color: "#f87171",
    bgColor: "rgba(248, 113, 113, 0.2)",
  },
  Creating: {
    damage: 30,
    color: "#a78bfa",
    bgColor: "rgba(167, 139, 250, 0.2)",
  },
};

// Rarity Weights for Card Distribution (Exact percentages as specified)
const RARITY_WEIGHTS = {
  Remembering: 20, // Most Common (28.6%) • 5 HP
  Understanding: 15, // Common (21.4%) • 10 HP
  Applying: 12, // Uncommon (17.1%) • 15 HP
  Analyzing: 10, // Rare (14.3%) • 20 HP
  Evaluating: 8, // Very Rare (11.4%) • 25 HP
  Creating: 5, // Extremely Rare (7.1%) • 30 HP
  // Total: 70
};

// Game States
const GAME_STATES = {
  PLAYING: "playing",
  FINISHED: "finished",
  WAITING: "waiting",
};

// Game Phases
const GAME_PHASES = {
  CARD_SELECTION: "cardSelection",
  ANSWERING: "answering",
};

// Action Types
const ACTION_TYPES = {
  SELECT_CARD: "select_card",
  ANSWER_QUESTION: "answer_question",
};

module.exports = {
  GAME_CONFIG,
  BLOOM_CONFIG,
  RARITY_WEIGHTS,
  GAME_STATES,
  GAME_PHASES,
  ACTION_TYPES,
};
