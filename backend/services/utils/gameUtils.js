// Utility function to transform card data for database storage
const transformCardForDatabase = (card) => {
  if (!card || typeof card !== "object") {
    console.warn("⚠️ Invalid card data for transformation:", card);
    return null;
  }

  return {
    id: String(card.id || ""),
    type: String(card.type || ""),
    // Question card fields
    question: String(card.question || ""),
    choices: Array.isArray(card.choices)
      ? card.choices.map((c) => String(c))
      : [],
    answer: String(card.answer || ""),
    bloom_level: String(card.bloom_level || card.bloomLevel || ""),
    name: String(card.name || ""),
    description: String(card.description || ""),
    // Common fields
    icon: String(card.icon || ""),
    color: String(card.color || ""),
    bgColor: String(card.bgColor || ""),
    // Additional fields
    damage: Number(card.damage || 0),
  };
};

// Utility function to transform card data from database back to frontend format
const transformCardFromDatabase = (card) => ({
  id: String(card.id),
  type: String(card.type),
  question: String(card.question || ""),
  choices: Array.isArray(card.choices)
    ? card.choices.map((c) => String(c))
    : [],
  answer: String(card.answer || ""),
  correctAnswer: String(card.answer || ""), // Add correctAnswer alias
  bloomLevel: String(card.bloom_level || card.bloomLevel || ""), // Convert bloom_level back to bloomLevel
  name: String(card.name || ""),
  description: String(card.description || ""),
  icon: String(card.icon || ""),
  color: String(card.color || ""),
  bgColor: String(card.bgColor || ""),
  // Use the damage that was already calculated and stored in the card
  damage:
    Number(card.damage) ||
    getDamageByBloomLevel(card.bloom_level || card.bloomLevel || "Remembering"),
  // Add questionData structure for frontend compatibility
  questionData: {
    _id: String(card.id),
    questionText: String(card.question || ""),
    choices: Array.isArray(card.choices)
      ? card.choices.map((c) => String(c))
      : [],
    correctAnswer: String(card.answer || ""),
    bloomsLevel: String(card.bloom_level || card.bloomLevel || "Remembering"),
  },
});

// Server-side RNG utilities
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const generateRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Normalize bloom level
const normalizeBloomLevel = (level) => {
  if (!level) return "Remembering";

  const levelStr = level.toString().trim();

  // Direct exact matches first
  if (levelStr === "Remembering") return "Remembering";
  if (levelStr === "Understanding") return "Understanding";
  if (levelStr === "Applying") return "Applying";
  if (levelStr === "Analyzing") return "Analyzing";
  if (levelStr === "Evaluating") return "Evaluating";
  if (levelStr === "Creating") return "Creating";

  // Case-insensitive exact matches
  const lowerLevel = levelStr.toLowerCase();
  if (lowerLevel === "remembering") return "Remembering";
  if (lowerLevel === "understanding") return "Understanding";
  if (lowerLevel === "applying") return "Applying";
  if (lowerLevel === "analyzing") return "Analyzing";
  if (lowerLevel === "evaluating") return "Evaluating";
  if (lowerLevel === "creating") return "Creating";

  // Partial matches as fallback
  if (lowerLevel.includes("remember")) return "Remembering";
  if (lowerLevel.includes("understand")) return "Understanding";
  if (lowerLevel.includes("apply")) return "Applying";
  if (lowerLevel.includes("analyze")) return "Analyzing";
  if (lowerLevel.includes("evaluate")) return "Evaluating";
  if (lowerLevel.includes("create")) return "Creating";

  // Default fallback
  console.warn(`Unknown Bloom's level: "${level}" - defaulting to Remembering`);
  return "Remembering";
};

// Get damage by bloom level
const getDamageByBloomLevel = (bloomLevel) => {
  const damageMap = {
    Remembering: 5,
    Understanding: 10,
    Applying: 15,
    Analyzing: 20,
    Evaluating: 25,
    Creating: 30,
  };
  return damageMap[bloomLevel] || 10;
};

// Validate game state
const validateGameState = (gameState) => {
  if (!gameState) return false;
  if (!gameState.players || !Array.isArray(gameState.players)) return false;
  if (gameState.players.length !== 2) return false;
  return true;
};

// Validate player data
const validatePlayerData = (player) => {
  if (!player) return false;
  if (!player.userId) return false;
  if (!player.name && !player.username) return false;
  return true;
};

module.exports = {
  transformCardForDatabase,
  transformCardFromDatabase,
  shuffleArray,
  generateRandomNumber,
  normalizeBloomLevel,
  getDamageByBloomLevel,
  validateGameState,
  validatePlayerData,
};
