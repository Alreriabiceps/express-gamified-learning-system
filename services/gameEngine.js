const Question = require("../users/admin/question/models/questionModels");
const GameRoom = require("../models/GameRoom");
const mongoose = require("mongoose");

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

class GameEngine {
  constructor() {
    this.games = new Map();
    // Map a lobbyId -> latest active roomId
    this.lobbyToRoom = new Map();
    // Simple per-lobby init lock to avoid double initialization
    this.initializationLocks = new Set();
  }

  // Server-side RNG utilities
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Create spell cards with server-side RNG
  createSpellCards() {
    const spellCards = [];
    Object.keys(SPELL_CARDS_CONFIG).forEach((spellType, index) => {
      spellCards.push({
        id: `spell_${index + 1000}`,
        spell_type: spellType,
        type: "spell",
        name: SPELL_CARDS_CONFIG[spellType].name,
        description: SPELL_CARDS_CONFIG[spellType].description,
        color: SPELL_CARDS_CONFIG[spellType].color,
        bgColor: SPELL_CARDS_CONFIG[spellType].bgColor,
        spellType: SPELL_CARDS_CONFIG[spellType].type,
      });
    });
    return spellCards;
  }

  // Initialize game with server-side deck creation
  async initializeGame(roomId, players, lobbyId) {
    try {
      console.log("Initializing game with:", { roomId, players, lobbyId });

      // Fetch questions from database
      let questions = await Question.find({}).lean();
      console.log(`Found ${questions.length} questions in database`);

      // Fallback: seed mock questions in dev if none exist to avoid 500
      if (!questions || questions.length === 0) {
        console.warn("No questions found; using mock questions for game setup");
        questions = Array.from({ length: 12 }).map((_, idx) => ({
          _id: `mock_${idx + 1}`,
          questionText: `Sample question ${idx + 1}?`,
          choices: ["A", "B", "C", "D"],
          correctAnswer: "A",
          bloomsLevel: "Remembering",
        }));
      }

      // Transform questions to game format
      const transformedQuestions = questions.map((question, index) => ({
        id: question._id || index,
        type: "question",
        question: question.questionText,
        choices: question.choices || [],
        answer: question.correctAnswer,
        bloom_level: this.normalizeBloomLevel(question.bloomsLevel),
        subject: "General", // Default subject since we don't have subject details in this context
        difficulty: "medium", // Default difficulty
      }));

      // Create spell cards
      const spellCards = this.createSpellCards();

      // Shuffle deck server-side
      const deck = this.shuffleArray([...transformedQuestions, ...spellCards]);

      // Distribute cards to players
      const player1Cards = [];
      const player2Cards = [];

      // Deal 4 cards to each player
      for (let i = 0; i < 4; i++) {
        if (deck.length > 0) {
          const card1 = deck.pop();
          player1Cards.push(card1);
        }
        if (deck.length > 0) {
          const card2 = deck.pop();
          player2Cards.push(card2);
        }
      }

      // Add spell cards with 18% chance
      this.addSpellCard(player1Cards, spellCards);
      this.addSpellCard(player2Cards, spellCards);

      // Create game state
      const gameState = {
        roomId,
        gameId: `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        lobbyId,
        players: [
          {
            userId: String(players[0].userId || ""),
            username: String(players[0].username || "Player"),
            hp: 100,
            maxHp: 100,
            cards: player1Cards,
            powerUps: {
              double_damage: { available: false, used: false },
              shield: { available: false, used: false },
              hint_reveal: { available: false, used: false },
              extra_turn: { available: false, used: false },
              card_draw: { available: false, used: false },
              fifty_fifty: { available: false, used: false },
            },
            activatedSpells: [],
          },
          {
            userId: String(players[1].userId || ""),
            username: String(players[1].username || "Player"),
            hp: 100,
            maxHp: 100,
            cards: player2Cards,
            powerUps: {
              double_damage: { available: false, used: false },
              shield: { available: false, used: false },
              hint_reveal: { available: false, used: false },
              extra_turn: { available: false, used: false },
              card_draw: { available: false, used: false },
              fifty_fifty: { available: false, used: false },
            },
            activatedSpells: [],
          },
        ],
        currentTurn: players[0].userId,
        gamePhase: "cardSelection",
        deck,
        selectedCard: null,
        gameState: "playing",
        winner: null,
        powerUpEffects: {
          doubleDamage: false,
          shield: false,
          hintReveal: false,
          extraTurn: false,
          fiftyFifty: false,
        },
      };

      // Save to database
      console.log("Saving game state to database...");

      // Ensure deck and player cards are properly structured as arrays of objects
      const gameStateForDB = {
        ...gameState,
        lobbyId: mongoose.Types.ObjectId.isValid(String(lobbyId))
          ? new mongoose.Types.ObjectId(String(lobbyId))
          : undefined,
        players: gameState.players.map((player) => ({
          ...player,
          cards: player.cards.map((card) => ({
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
          })),
        })),
        deck: gameState.deck.map((card) => ({
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
        })),
      };

      // Ensure we're not accidentally converting arrays to strings
      console.log(
        "Saving game state with deck length:",
        gameStateForDB.deck.length
      );
      console.log("First deck item type:", typeof gameStateForDB.deck[0]);

      try {
        const gameRoom = new GameRoom(gameStateForDB);
        await gameRoom.save();
        console.log("Game state saved successfully");
      } catch (saveError) {
        console.error(
          "Game state save failed, continuing without DB persist:",
          saveError?.message
        );
      }

      // Store in memory for quick access
      this.games.set(roomId, gameState);
      this.lobbyToRoom.set(String(lobbyId), roomId);
      console.log("Game state stored in memory");

      return gameState;
    } catch (error) {
      console.error("Error initializing game:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw error;
    }
  }

  // Add spell card with server-side RNG
  addSpellCard(playerCards, spellCards) {
    if (Math.random() < 0.18) {
      // 18% chance
      const randomSpell =
        spellCards[Math.floor(Math.random() * spellCards.length)];
      playerCards.push(randomSpell);
    }
  }

  // Normalize bloom level
  normalizeBloomLevel(level) {
    if (!level) return "Remembering";

    const levelStr = level.toString().toLowerCase();
    if (levelStr.includes("remember")) return "Remembering";
    if (levelStr.includes("understand")) return "Understanding";
    if (levelStr.includes("apply")) return "Applying";
    if (levelStr.includes("analyze")) return "Analyzing";
    if (levelStr.includes("evaluate")) return "Evaluating";
    if (levelStr.includes("create")) return "Creating";

    return "Remembering";
  }

  // Validate action
  validateAction(gameState, playerId, action) {
    // Check if it's player's turn
    if (gameState.currentTurn !== playerId) {
      return { valid: false, error: "Not your turn" };
    }

    // Check game state
    if (gameState.gameState !== "playing") {
      return { valid: false, error: "Game not in playing state" };
    }

    // Validate action type
    const validActions = [
      "select_card",
      "answer_question",
      "use_powerup",
      "activate_spell",
    ];
    if (!validActions.includes(action.type)) {
      return { valid: false, error: "Invalid action type" };
    }

    return { valid: true };
  }

  // Process game action
  async processAction(roomId, playerId, action) {
    const gameState = this.games.get(roomId);
    if (!gameState) {
      throw new Error("Game not found");
    }

    // Validate action
    const validation = this.validateAction(gameState, playerId, action);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Process action based on type
    switch (action.type) {
      case "select_card":
        return this.processSelectCard(gameState, playerId, action.cardId);
      case "answer_question":
        return this.processAnswerQuestion(gameState, playerId, action.answer);
      case "use_powerup":
        return this.processUsePowerUp(gameState, playerId, action.powerUpType);
      case "activate_spell":
        return this.processActivateSpell(gameState, playerId, action.spellCard);
      default:
        throw new Error("Unknown action type");
    }
  }

  // Process card selection
  processSelectCard(gameState, playerId, cardId) {
    const player = gameState.players.find((p) => p.userId === playerId);
    const card = player.cards.find((c) => c.id === cardId);

    if (!card) {
      throw new Error("Card not found");
    }

    gameState.selectedCard = card;
    gameState.gamePhase = "answering";

    // Update database
    this.updateGameInDatabase(gameState);

    return {
      type: "card_selected",
      card,
      gameState,
    };
  }

  // Process answer to question
  processAnswerQuestion(gameState, playerId, answer) {
    const selectedCard = gameState.selectedCard;
    const isCorrect = answer === selectedCard.answer;

    // Calculate damage
    const damage = this.calculateDamage(selectedCard, isCorrect, gameState);

    // Apply damage
    const targetPlayer = isCorrect
      ? gameState.players.find((p) => p.userId === gameState.currentTurn)
      : gameState.players.find((p) => p.userId !== gameState.currentTurn);

    targetPlayer.hp = Math.max(0, targetPlayer.hp - damage);

    // Check for game end
    if (targetPlayer.hp <= 0) {
      gameState.gameState = "finished";
      gameState.winner = gameState.players.find(
        (p) => p.userId !== targetPlayer.userId
      ).userId;
    } else {
      // Switch turns
      const nextPlayer = gameState.players.find(
        (p) => p.userId !== gameState.currentTurn
      );
      gameState.currentTurn = nextPlayer.userId;
      gameState.gamePhase = "cardSelection";
      gameState.selectedCard = null;

      // Draw new card for next player
      if (gameState.deck.length > 0) {
        const newCard = gameState.deck.pop();
        nextPlayer.cards.push(newCard);
      }
    }

    // Update database
    this.updateGameInDatabase(gameState);

    return {
      type: "answer_processed",
      isCorrect,
      damage,
      gameState,
    };
  }

  // Calculate damage with power-ups and spells
  calculateDamage(card, isCorrect, gameState) {
    let baseDamage = BLOOM_CONFIG[card.bloom_level]?.damage || 5;

    // Apply power-up effects
    if (gameState.powerUpEffects.doubleDamage && isCorrect) {
      baseDamage *= 2;
    }

    if (gameState.powerUpEffects.shield && !isCorrect) {
      baseDamage = 0;
    }

    // Apply spell effects
    const currentPlayer = gameState.players.find(
      (p) => p.userId === gameState.currentTurn
    );
    currentPlayer.activatedSpells.forEach((spell) => {
      switch (spell.spell_type) {
        case "chain_lightning":
          if (isCorrect) baseDamage += 5;
          break;
        case "damage_boost":
          if (isCorrect) baseDamage += 10;
          break;
        case "critical_strike":
          if (Math.random() < 0.25) baseDamage *= 3;
          break;
        case "immunity":
          if (!isCorrect) baseDamage = 0;
          break;
        case "damage_reduction":
          baseDamage = Math.floor(baseDamage * 0.5);
          break;
      }
    });

    return baseDamage;
  }

  // Process power-up usage
  processUsePowerUp(gameState, playerId, powerUpType) {
    const player = gameState.players.find((p) => p.userId === playerId);
    const powerUp = player.powerUps[powerUpType];

    if (!powerUp || !powerUp.available || powerUp.used) {
      throw new Error("Power-up not available");
    }

    // Mark power-up as used
    powerUp.used = true;
    powerUp.available = false;

    // Apply power-up effect
    switch (powerUpType) {
      case "double_damage":
        gameState.powerUpEffects.doubleDamage = true;
        break;
      case "shield":
        gameState.powerUpEffects.shield = true;
        break;
      case "hint_reveal":
        gameState.powerUpEffects.hintReveal = true;
        break;
      case "extra_turn":
        gameState.powerUpEffects.extraTurn = true;
        break;
      case "fifty_fifty":
        gameState.powerUpEffects.fiftyFifty = true;
        break;
      case "card_draw":
        // Draw 2 extra cards
        for (let i = 0; i < 2; i++) {
          if (gameState.deck.length > 0) {
            const card = gameState.deck.pop();
            player.cards.push(card);
          }
        }
        break;
    }

    // Update database
    this.updateGameInDatabase(gameState);

    return {
      type: "powerup_used",
      powerUpType,
      gameState,
    };
  }

  // Process spell activation
  processActivateSpell(gameState, playerId, spellCard) {
    const player = gameState.players.find((p) => p.userId === playerId);

    // Remove spell card from player's hand
    player.cards = player.cards.filter((c) => c.id !== spellCard.id);

    // Add to activated spells
    player.activatedSpells.push(spellCard);

    // Update database
    this.updateGameInDatabase(gameState);

    return {
      type: "spell_activated",
      spellCard,
      gameState,
    };
  }

  // Update game in database
  async updateGameInDatabase(gameState) {
    try {
      await GameRoom.findOneAndUpdate(
        { roomId: gameState.roomId },
        {
          $set: {
            ...gameState,
            lastActivity: new Date(),
          },
        },
        { new: true }
      );
    } catch (error) {
      console.error("Error updating game in database:", error);
    }
  }

  // Get game state
  getGameState(roomId) {
    return this.games.get(roomId);
  }

  // Resolve active roomId for a given lobby if present in-memory
  getActiveRoomIdByLobbyId(lobbyId) {
    const mapped = this.lobbyToRoom.get(String(lobbyId));
    if (mapped && this.games.get(mapped)?.gameState !== "finished") {
      return mapped;
    }
    // Fallback: scan in-memory games
    for (const [roomId, state] of this.games.entries()) {
      if (
        String(state.lobbyId) === String(lobbyId) &&
        state.gameState !== "finished"
      ) {
        return roomId;
      }
    }
    return null;
  }

  // Acquire a simple lock for a lobby to avoid double init
  async withInitializationLock(lobbyId, fn) {
    while (this.initializationLocks.has(String(lobbyId))) {
      // Busy-wait very briefly to serialize; low contention expected
      await new Promise((r) => setTimeout(r, 25));
    }
    this.initializationLocks.add(String(lobbyId));
    try {
      return await fn();
    } finally {
      this.initializationLocks.delete(String(lobbyId));
    }
  }

  // Clean up game
  async cleanupGame(roomId) {
    this.games.delete(roomId);
    try {
      await GameRoom.findOneAndDelete({ roomId });
    } catch (error) {
      console.error("Error cleaning up game:", error);
    }
  }
}

module.exports = new GameEngine();
