// Utility function to transform card data for database storage
const transformCardForDatabase = (card) => ({
  id: String(card.id),
  type: String(card.type),
  question: String(card.question || ""),
  choices: Array.isArray(card.choices)
    ? card.choices.map((c) => String(c))
    : [],
  answer: String(card.answer || ""),
  bloom_level: String(card.bloom_level || ""),
  spell_type: String(card.spell_type || ""),
  name: String(card.name || ""),
  description: String(card.description || ""),
  icon: String(card.icon || ""),
  color: String(card.color || ""),
  bgColor: String(card.bgColor || ""),
});

// Utility function to transform spell data for database storage
const transformSpellForDatabase = (spell) => ({
  id: String(spell.id),
  spell_type: String(spell.spell_type || ""),
  name: String(spell.name || ""),
  description: String(spell.description || ""),
  icon: String(spell.icon || ""),
  color: String(spell.color || ""),
  bgColor: String(spell.bgColor || ""),
  type: String(spell.type || ""),
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

  const levelStr = level.toString().toLowerCase();
  if (levelStr.includes("remember")) return "Remembering";
  if (levelStr.includes("understand")) return "Understanding";
  if (levelStr.includes("apply")) return "Applying";
  if (levelStr.includes("analyze")) return "Analyzing";
  if (levelStr.includes("evaluate")) return "Evaluating";
  if (levelStr.includes("create")) return "Creating";

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
  transformSpellForDatabase,
  shuffleArray,
  generateRandomNumber,
  normalizeBloomLevel,
  getDamageByBloomLevel,
  validateGameState,
  validatePlayerData,
};


