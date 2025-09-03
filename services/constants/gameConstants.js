// Game Configuration Constants
const GAME_CONFIG = {
  INITIAL_HP: 100,
  INITIAL_CARDS: 5,
  SPELL_CARD_CHANCE: 0.18, // 18% chance
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

// Spell Cards Configuration
const SPELL_CARDS_CONFIG = {
  chain_lightning: {
    name: "Chain Lightning",
    description: "If you answer correctly, opponent loses an extra 5 HP",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.2)",
    type: "offensive",
    damage: 5,
  },
  damage_boost: {
    name: "Damage Boost",
    description: "Next correct answer deals +10 extra damage",
    color: "#dc2626",
    bgColor: "rgba(220, 38, 38, 0.2)",
    type: "offensive",
    damage: 10,
  },
  critical_strike: {
    name: "Critical Strike",
    description: "25% chance your next attack deals 3x damage",
    color: "#dc2626",
    bgColor: "rgba(220, 38, 38, 0.2)",
    type: "offensive",
    multiplier: 3,
  },
  card_burn: {
    name: "Card Burn",
    description: "Opponent discards 2 random cards from their hand",
    color: "#ea580c",
    bgColor: "rgba(234, 88, 12, 0.2)",
    type: "offensive",
  },
  heal: {
    name: "Heal",
    description: "Restore 20 HP instantly",
    color: "#059669",
    bgColor: "rgba(5, 150, 105, 0.2)",
    type: "defensive",
    healing: 20,
  },
  reflect: {
    name: "Reflect",
    description: "Next wrong answer damages the questioner instead",
    color: "#0891b2",
    bgColor: "rgba(8, 145, 178, 0.2)",
    type: "defensive",
  },
  immunity: {
    name: "Immunity",
    description: "Can't take damage for one turn",
    color: "#0284c7",
    bgColor: "rgba(2, 132, 199, 0.2)",
    type: "defensive",
  },
  damage_reduction: {
    name: "Damage Reduction",
    description: "Next incoming damage is reduced by 50%",
    color: "#0891b2",
    bgColor: "rgba(8, 145, 178, 0.2)",
    type: "defensive",
  },
  card_swap: {
    name: "Card Swap",
    description: "Exchange your hand with opponent's hand",
    color: "#7c3aed",
    bgColor: "rgba(124, 58, 237, 0.2)",
    type: "utility",
  },
  question_reroll: {
    name: "Question Reroll",
    description: "Get a new question card instead of current one",
    color: "#059669",
    bgColor: "rgba(5, 150, 105, 0.2)",
    type: "utility",
  },
  turn_skip: {
    name: "Turn Skip",
    description: "Skip opponent's next turn completely",
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.2)",
    type: "utility",
  },
  second_chance: {
    name: "Second Chance",
    description: "Retry the same question after getting it wrong",
    color: "#dc2626",
    bgColor: "rgba(220, 38, 38, 0.2)",
    type: "utility",
  },
  freeze: {
    name: "Freeze",
    description: "Opponent loses one turn",
    color: "#0891b2",
    bgColor: "rgba(8, 145, 178, 0.2)",
    type: "utility",
  },
  time_pressure: {
    name: "Time Pressure",
    description: "Cut opponent's timer in half for their next turn",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.2)",
    type: "utility",
  },
};

// Rarity Weights for Card Distribution
const RARITY_WEIGHTS = {
  Remembering: 15, // Most common
  Understanding: 12, // Common
  Applying: 10, // Uncommon
  Analyzing: 7, // Rare
  Evaluating: 4, // Very rare
  Creating: 2, // Legendary
  spell: 8, // Spell cards
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
  RESULT: "result",
};

// Action Types
const ACTION_TYPES = {
  SELECT_CARD: "select_card",
  ANSWER_QUESTION: "answer_question",
};

module.exports = {
  GAME_CONFIG,
  BLOOM_CONFIG,
  SPELL_CARDS_CONFIG,
  RARITY_WEIGHTS,
  GAME_STATES,
  GAME_PHASES,
  ACTION_TYPES,
};


