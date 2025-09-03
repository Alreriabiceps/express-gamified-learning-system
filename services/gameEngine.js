const Question = require("../users/admin/question/models/questionModels");
const GameRoom = require("../models/GameRoom");
const PvPMatch = require("../users/students/pvp/models/pvpMatchModel");
const Student = require("../users/admin/student/models/studentModels");
const mongoose = require("mongoose");

// Import constants and utilities
const {
  GAME_CONFIG,
  BLOOM_CONFIG,
  SPELL_CARDS_CONFIG,
  RARITY_WEIGHTS,
  GAME_STATES,
  GAME_PHASES,
  ACTION_TYPES,
} = require("./constants/gameConstants");

const {
  transformCardForDatabase,
  transformSpellForDatabase,
  shuffleArray,
  generateRandomNumber,
  normalizeBloomLevel,
  getDamageByBloomLevel,
  validateGameState,
  validatePlayerData,
} = require("./utils/gameUtils");

class GameEngine {
  constructor() {
    this.games = new Map();
    // Map a lobbyId -> latest active roomId
    this.lobbyToRoom = new Map();
    // Simple per-lobby init lock to avoid double initialization
    this.initializationLocks = new Set();
  }

  // Use imported utility functions
  shuffleArray = shuffleArray;
  generateRandomNumber = generateRandomNumber;

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

  // Create weighted deck with improved rarity distribution
  createWeightedDeck(questionCards, spellCards) {
    const deck = [];

    // Add question cards with weighted distribution
    questionCards.forEach((card) => {
      const weight = RARITY_WEIGHTS[card.bloom_level] || 5;
      // Add multiple copies based on weight
      for (let i = 0; i < weight; i++) {
        deck.push({ ...card, id: `${card.id}_${i}` });
      }
    });

    // Add spell cards with weighted distribution
    spellCards.forEach((card) => {
      const weight = RARITY_WEIGHTS.spell;
      for (let i = 0; i < weight; i++) {
        deck.push({ ...card, id: `${card.id}_${i}` });
      }
    });

    // Shuffle the weighted deck
    return this.shuffleArray(deck);
  }

  // Initialize game with server-side deck creation
  async initializeGame(roomId, players, lobbyId) {
    try {
      console.log("🎮 Initializing game with:", {
        roomId,
        lobbyId,
        playersCount: players.length,
        players: players.map((p) => ({
          userId: p.userId,
          username: p.username,
          name: p.name,
          rawData: p,
        })),
      });

      // Debug: Log the exact structure of each player
      this.logPlayerData(players);

      // Create deck and cards
      const { deck, transformedQuestions, spellCards } =
        await this.createGameDeck();

      // Distribute cards to players
      const { player1Cards, player2Cards } = this.distributeCardsToPlayers(
        deck,
        spellCards
      );

      // Create game state
      const gameState = this.createGameState(
        roomId,
        players,
        lobbyId,
        player1Cards,
        player2Cards,
        deck
      );

      console.log("🎯 Game state created:", {
        currentTurn: gameState.currentTurn,
        currentTurnType: typeof gameState.currentTurn,
        player1: {
          userId: gameState.players[0].userId,
          name: gameState.players[0].name,
          username: gameState.players[0].username,
          firstName: gameState.players[0].firstName,
          lastName: gameState.players[0].lastName,
        },
        player2: {
          userId: gameState.players[1].userId,
          name: gameState.players[1].name,
          username: gameState.players[1].username,
          firstName: gameState.players[1].firstName,
          lastName: gameState.players[1].lastName,
        },
      });

      // Draw initial card for the first player (they start with 5, draw 1 to have 6)
      const firstPlayer = gameState.players.find(
        (p) => String(p.userId) === String(gameState.currentTurn)
      );
      if (firstPlayer) {
        this.drawCardForPlayer(gameState, firstPlayer);
      }

      // Save to database
      await this.saveGameStateToDatabase(gameState, lobbyId);

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
    if (Math.random() < GAME_CONFIG.SPELL_CARD_CHANCE) {
      const randomSpell =
        spellCards[Math.floor(Math.random() * spellCards.length)];
      playerCards.push(randomSpell);
    }
  }

  // Draw a card for a player when their turn starts
  drawCardForPlayer(gameState, player) {
    if (gameState.deck.length > 0) {
      const newCard = gameState.deck.pop();
      player.cards.push(newCard);
      console.log("🃏 Drew new card for player:", {
        playerId: player.userId,
        playerName: player.name,
        cardId: newCard.id,
        cardType: newCard.type,
        playerCardsCount: player.cards.length,
        remainingDeck: gameState.deck.length,
      });
    } else {
      console.log("⚠️ No cards left in deck for player:", player.name);
    }
  }

  // Use imported normalizeBloomLevel function
  normalizeBloomLevel = normalizeBloomLevel;

  // Log player data for debugging
  logPlayerData(players) {
    players.forEach((player, index) => {
      console.log(`👤 Player ${index + 1} raw data:`, {
        keys: Object.keys(player),
        userId: player.userId,
        username: player.username,
        name: player.name,
        firstName: player.firstName,
        lastName: player.lastName,
        fullData: player,
      });
    });
  }

  // Create game deck with questions and spell cards
  async createGameDeck() {
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
    const transformedQuestions = questions.map((question, index) => {
      const bloomLevel = this.normalizeBloomLevel(question.bloomsLevel);
      return {
        id: String(question._id || index),
        type: `bloom-${bloomLevel.toLowerCase()}`,
        question: question.questionText,
        choices: question.choices || [],
        answer: question.correctAnswer,
        bloom_level: bloomLevel,
        bloomLevel: bloomLevel, // Add bloomLevel for frontend compatibility
        damage: this.getDamageByBloomLevel(bloomLevel), // Add damage field
        subject: "General", // Default subject since we don't have subject details in this context
        difficulty: "medium", // Default difficulty
      };
    });

    // Create spell cards
    const spellCards = this.createSpellCards();

    // Create weighted deck with improved rarity distribution
    const deck = this.createWeightedDeck(transformedQuestions, spellCards);

    return { deck, transformedQuestions, spellCards };
  }

  // Distribute cards to players
  distributeCardsToPlayers(deck, spellCards) {
    const player1Cards = [];
    const player2Cards = [];

    // Deal initial cards to each player
    for (let i = 0; i < GAME_CONFIG.INITIAL_CARDS; i++) {
      if (deck.length > 0) {
        const card1 = deck.pop();
        player1Cards.push(card1);
      }
      if (deck.length > 0) {
        const card2 = deck.pop();
        player2Cards.push(card2);
      }
    }

    // Add spell cards with configured chance
    this.addSpellCard(player1Cards, spellCards);
    this.addSpellCard(player2Cards, spellCards);

    return { player1Cards, player2Cards };
  }

  // Create game state object
  createGameState(roomId, players, lobbyId, player1Cards, player2Cards, deck) {
    return {
      roomId,
      gameId: `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      lobbyId,
      players: [
        {
          userId: String(players[0].userId || ""),
          username: String(players[0].username || players[0].name || "Player"),
          name: String(players[0].name || players[0].username || "Player"), // Prioritize name over username
          firstName: players[0].firstName || "",
          lastName: players[0].lastName || "",
          hp: GAME_CONFIG.INITIAL_HP,
          maxHp: GAME_CONFIG.INITIAL_HP,
          cards: player1Cards,
          powerUps: {}, // Power-ups not currently implemented
          activatedSpells: [],
        },
        {
          userId: String(players[1].userId || ""),
          username: String(players[1].username || players[1].name || "Player"),
          name: String(players[1].name || players[1].username || "Player"), // Prioritize name over username
          firstName: players[1].firstName || "",
          lastName: players[1].lastName || "",
          hp: GAME_CONFIG.INITIAL_HP,
          maxHp: GAME_CONFIG.INITIAL_HP,
          cards: player2Cards,
          powerUps: {}, // Power-ups not currently implemented
          activatedSpells: [],
        },
      ],
      currentTurn: players[0].userId, // First player goes first
      gamePhase: GAME_PHASES.CARD_SELECTION,
      deck,
      selectedCard: null,
      gameState: GAME_STATES.PLAYING,
      winner: null,
      powerUpEffects: {}, // Power-up effects not currently implemented
    };
  }

  // Save game state to database
  async saveGameStateToDatabase(gameState, lobbyId) {
    console.log("Saving game state to database...");

    // Process lobbyId for database
    const processedLobbyId = this.processLobbyIdForDatabase(lobbyId);

    // Prepare game state for database
    const gameStateForDB = this.prepareGameStateForDatabase(
      gameState,
      processedLobbyId
    );

    // Validate game state structure
    this.validateGameStateStructure(gameStateForDB);

    try {
      console.log("📝 Creating GameRoom instance...");
      const gameRoom = new GameRoom(gameStateForDB);
      console.log("💾 Saving to database...");
      const savedRoom = await gameRoom.save();
      console.log("✅ Game state saved successfully to database");
      console.log("📋 Saved room ID:", savedRoom.roomId);
      console.log("📋 Saved game ID:", savedRoom.gameId);
    } catch (saveError) {
      console.error("❌ CRITICAL: Game state save failed!");
      console.error("❌ Error message:", saveError?.message);
      console.error("❌ Error name:", saveError?.name);
      console.error("❌ Full error:", saveError);
      console.error("❌ Game data that failed to save:", {
        roomId: gameStateForDB.roomId,
        gameId: gameStateForDB.gameId,
        playersCount: gameStateForDB.players?.length,
        deckCount: gameStateForDB.deck?.length,
        deckType: typeof gameStateForDB.deck,
        playersType: typeof gameStateForDB.players,
      });

      // Log the actual data structure that failed
      console.error(
        "❌ Failed data structure:",
        JSON.stringify(gameStateForDB, null, 2)
      );
    }
  }

  // Process lobbyId for database storage
  processLobbyIdForDatabase(lobbyId) {
    console.log(
      "🔍 Processing lobbyId for database:",
      lobbyId,
      "Type:",
      typeof lobbyId
    );

    if (mongoose.Types.ObjectId.isValid(String(lobbyId))) {
      const processedLobbyId = new mongoose.Types.ObjectId(String(lobbyId));
      console.log("✅ Valid ObjectId, using:", processedLobbyId);
      return processedLobbyId;
    } else {
      // Create a new ObjectId if the provided one is invalid
      const processedLobbyId = new mongoose.Types.ObjectId();
      console.log(
        "⚠️ Invalid lobbyId, creating new ObjectId:",
        processedLobbyId
      );
      return processedLobbyId;
    }
  }

  // Prepare game state for database storage
  prepareGameStateForDatabase(gameState, processedLobbyId) {
    // Deep clone the game state to avoid mutation issues
    return JSON.parse(
      JSON.stringify({
        ...gameState,
        lobbyId: processedLobbyId,
        players: gameState.players.map((player) => ({
          ...player,
          cards: player.cards.map(transformCardForDatabase),
        })),
        deck: gameState.deck.map(transformCardForDatabase),
      })
    );
  }

  // Validate game state structure before saving
  validateGameStateStructure(gameStateForDB) {
    // Additional validation and logging
    console.log("🔍 Final gameStateForDB structure:");
    console.log("- Deck type:", typeof gameStateForDB.deck);
    console.log("- Deck isArray:", Array.isArray(gameStateForDB.deck));
    console.log("- Deck length:", gameStateForDB.deck?.length);
    console.log("- First deck item:", gameStateForDB.deck?.[0]);
    console.log("- Players count:", gameStateForDB.players?.length);
    console.log("- First player:", gameStateForDB.players?.[0]);

    // Ensure we're not accidentally converting arrays to strings
    console.log(
      "Saving game state with deck length:",
      gameStateForDB.deck.length
    );
    console.log("First deck item type:", typeof gameStateForDB.deck[0]);

    // Validate deck structure before saving
    if (!Array.isArray(gameStateForDB.deck)) {
      console.error("❌ CRITICAL: Deck is not an array!");
      console.error("❌ Deck type:", typeof gameStateForDB.deck);
      console.error("❌ Deck value:", gameStateForDB.deck);
      throw new Error("Deck must be an array");
    }

    // Validate each deck item
    gameStateForDB.deck.forEach((card, index) => {
      if (typeof card !== "object" || card === null) {
        console.error(`❌ CRITICAL: Deck item ${index} is not an object!`);
        console.error(`❌ Item type:`, typeof card);
        console.error(`❌ Item value:`, card);
        throw new Error(`Deck item ${index} must be an object`);
      }
    });

    // Final validation before creating the model instance
    if (!gameStateForDB.deck || !Array.isArray(gameStateForDB.deck)) {
      throw new Error(`Invalid deck structure: ${typeof gameStateForDB.deck}`);
    }

    if (!gameStateForDB.players || !Array.isArray(gameStateForDB.players)) {
      throw new Error(
        `Invalid players structure: ${typeof gameStateForDB.players}`
      );
    }
  }

  // Validate action
  validateAction(gameState, playerId, action) {
    console.log("🔍 validateAction called:", {
      currentTurn: gameState.currentTurn,
      playerId,
      actionType: action.type,
      gamePhase: gameState.gamePhase,
      currentTurnType: typeof gameState.currentTurn,
      playerIdType: typeof playerId,
      isEqual: String(gameState.currentTurn) === String(playerId),
    });

    // Special validation for answer_question action
    if (action.type === "answer_question") {
      // During answering phase, the opponent (not the current turn player) should answer
      const currentTurnPlayer = gameState.players.find(
        (p) => String(p.userId) === String(gameState.currentTurn)
      );
      const answeringPlayer = gameState.players.find(
        (p) => String(p.userId) === String(playerId)
      );

      if (!currentTurnPlayer || !answeringPlayer) {
        console.log("❌ Turn validation failed:", {
          reason: "Player not found in game",
          currentTurn: gameState.currentTurn,
          playerId,
        });
        return { valid: false, error: "Player not found in game" };
      }

      // The answering player should NOT be the current turn player (they should be the opponent)
      if (String(gameState.currentTurn) === String(playerId)) {
        console.log("❌ Turn validation failed:", {
          currentTurn: gameState.currentTurn,
          playerId,
          reason: "Cannot answer your own question",
        });
        return { valid: false, error: "Cannot answer your own question" };
      }

      // Check if there's a selected card to answer
      if (!gameState.selectedCard) {
        console.log("❌ Turn validation failed:", {
          reason: "No question to answer",
        });
        return { valid: false, error: "No question to answer" };
      }

      console.log("✅ Answer validation passed:", {
        challenger: currentTurnPlayer.username,
        answerer: answeringPlayer.username,
      });
      return { valid: true };
    }

    // For other actions (select_card, etc.), check if it's player's turn
    if (String(gameState.currentTurn) !== String(playerId)) {
      console.log("❌ Turn validation failed:", {
        currentTurn: gameState.currentTurn,
        playerId,
        reason: "Not your turn",
      });
      return { valid: false, error: "Not your turn" };
    }

    // Check game state
    if (gameState.gameState !== GAME_STATES.PLAYING) {
      return { valid: false, error: "Game not in playing state" };
    }

    // Validate action type
    const validActions = [
      ACTION_TYPES.SELECT_CARD,
      ACTION_TYPES.ANSWER_QUESTION,
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
      case ACTION_TYPES.SELECT_CARD:
        return this.processSelectCard(
          gameState,
          playerId,
          action.cardId,
          action.card || null
        );
      case ACTION_TYPES.ANSWER_QUESTION:
        return await this.processAnswerQuestion(
          gameState,
          playerId,
          action.answer
        );
      default:
        throw new Error("Unknown action type");
    }
  }

  // Process card selection
  processSelectCard(gameState, playerId, cardId, cardData = null) {
    console.log("🔍 processSelectCard called with:", {
      roomId: gameState.roomId,
      playerId,
      cardId,
      cardData: cardData
        ? {
            id: cardData.id,
            name: cardData.name,
            question: cardData.question,
            bloom_level: cardData.bloom_level,
            type: cardData.type,
          }
        : null,
    });

    const player = gameState.players.find(
      (p) => String(p.userId) === String(playerId)
    );

    if (!player) {
      console.error("❌ Player not found:", {
        playerId,
        availablePlayers: gameState.players.map((p) => ({
          userId: p.userId,
          name: p.name,
        })),
      });
      throw new Error("Player not found in game");
    }

    console.log("👤 Found player:", {
      userId: player.userId,
      name: player.name,
      cardsCount: player.cards?.length || 0,
      cardIds:
        player.cards?.map((c) => ({
          id: c.id,
          type: c.type,
          name: c.name || c.question,
        })) || [],
    });

    let card = player.cards.find((c) => String(c.id) === String(cardId));
    console.log("🎯 Direct ID match result:", {
      found: !!card,
      cardId,
      matchedCard: card ? { id: card.id, type: card.type } : null,
    });

    // Fallback semantic matching if IDs don't align perfectly
    if (!card && cardData) {
      console.log("🔄 Attempting semantic fallback match...");
      const targetName = String(cardData.name || "").trim();
      const targetQuestion = String(cardData.question || "").trim();
      const targetBloom = String(cardData.bloom_level || "").trim();

      console.log("🎯 Target card data:", {
        targetName,
        targetQuestion,
        targetBloom,
      });

      card = player.cards.find((c) => {
        const cName = String(c.name || "").trim();
        const cQuestion = String(c.question || "").trim();
        const cBloom = String(c.bloom_level || "").trim();

        const nameMatch = targetName && cName && cName === targetName;
        const questionMatch =
          targetQuestion && cQuestion && cQuestion === targetQuestion;
        const bloomMatch = !targetBloom || (cBloom && cBloom === targetBloom);

        console.log("🔍 Checking card:", {
          cardId: c.id,
          cName,
          cQuestion: cQuestion.substring(0, 50) + "...",
          cBloom,
          nameMatch,
          questionMatch,
          bloomMatch,
        });

        return (nameMatch || questionMatch) && bloomMatch;
      });

      console.log("🔄 Semantic fallback result:", {
        found: !!card,
        card: card ? { id: card.id, type: card.type } : null,
      });
    }

    if (!card) {
      console.error("❌ Card not found after all matching attempts:", {
        requestedCardId: cardId,
        requestedCardData: cardData,
        playerCards:
          player.cards?.map((c) => ({
            id: c.id,
            type: c.type,
            name: c.name || c.question,
          })) || [],
      });
      throw new Error("Card not found");
    }

    console.log("✅ Card found successfully:", {
      cardId: card.id,
      type: card.type,
    });

    // Remove the card from player's hand
    player.cards = player.cards.filter((c) => String(c.id) !== String(cardId));
    console.log("🗑️ Removed card from player's hand:", {
      playerId,
      cardId,
      remainingCards: player.cards.length,
    });

    gameState.selectedCard = card;
    gameState.gamePhase = GAME_PHASES.ANSWERING;

    // Update database
    this.updateGameInDatabase(gameState);

    return {
      type: "card_selected",
      card,
      gameState,
    };
  }

  // Process answer to question
  async processAnswerQuestion(gameState, playerId, answer) {
    console.log("🔄 processAnswerQuestion called:", {
      playerId,
      currentTurn: gameState.currentTurn,
      selectedCard: gameState.selectedCard
        ? {
            id: gameState.selectedCard.id,
            question: gameState.selectedCard.question,
          }
        : null,
    });

    const selectedCard = gameState.selectedCard;
    const isCorrect = answer === selectedCard.answer;

    console.log("📊 Answer result:", {
      isCorrect,
      answer,
      correctAnswer: selectedCard.answer,
    });

    // Calculate damage
    const damage = this.calculateDamage(selectedCard, isCorrect, gameState);

    // Apply damage - ALWAYS to the opponent (player who didn't answer)
    const answeringPlayer = gameState.players.find(
      (p) => String(p.userId) === String(playerId)
    );
    const opponentPlayer = gameState.players.find(
      (p) => String(p.userId) !== String(playerId)
    );

    if (!answeringPlayer || !opponentPlayer) {
      console.error("❌ Players not found for damage application");
      throw new Error("Players not found");
    }

    // If answer is correct, opponent takes damage. If wrong, answering player takes damage.
    const targetPlayer = isCorrect ? opponentPlayer : answeringPlayer;

    targetPlayer.hp = Math.max(0, targetPlayer.hp - damage);
    console.log("💥 Damage applied:", {
      targetPlayer: targetPlayer.name,
      damage,
      newHp: targetPlayer.hp,
      isCorrect,
      answeringPlayer: answeringPlayer.name,
      opponentPlayer: opponentPlayer.name,
    });

    console.log("🎯 Current game state HP values:", {
      player1: { name: gameState.players[0].name, hp: gameState.players[0].hp },
      player2: { name: gameState.players[1].name, hp: gameState.players[1].hp },
    });

    // Check for game end
    if (targetPlayer.hp <= 0) {
      gameState.gameState = GAME_STATES.FINISHED;
      gameState.winner = gameState.players.find(
        (p) => String(p.userId) !== String(targetPlayer.userId)
      ).userId;
      console.log("🏁 Game finished! Winner:", gameState.winner);

      // Process star rewards/penalties
      await this.processGameEndRewards(gameState);
    } else {
      // Switch turns after answering - the player who just answered gets the next turn
      const nextPlayer = answeringPlayer; // The answerer gets to challenge next

      const oldTurn = gameState.currentTurn;
      gameState.currentTurn = nextPlayer.userId;
      gameState.gamePhase = GAME_PHASES.CARD_SELECTION;
      gameState.selectedCard = null;

      console.log("🔄 Turn switched:", {
        from: oldTurn,
        to: nextPlayer.userId,
        playerName: nextPlayer.name,
        gamePhase: gameState.gamePhase,
        reason: "After answering question - answerer gets next turn",
      });

      // Draw a card for the next player when their turn starts
      this.drawCardForPlayer(gameState, nextPlayer);
    }

    // Update database
    this.updateGameInDatabase(gameState);

    return {
      type: "answer_processed",
      isCorrect,
      damage,
      answer,
      gameState,
      selectedCard: selectedCard, // Preserve the selected card data for the result popup
    };
  }

  // Calculate damage based on Bloom's level
  calculateDamage(card, isCorrect, gameState) {
    return BLOOM_CONFIG[card.bloom_level]?.damage || 5;
  }

  // Removed unused power-up and spell processing methods - not currently implemented

  // Update game in database
  async updateGameInDatabase(gameState) {
    try {
      // Only update specific fields that match the schema
      const updateData = {
        currentTurn: gameState.currentTurn,
        gamePhase: gameState.gamePhase,
        gameState: gameState.gameState,
        winner: gameState.winner,
        lastActivity: new Date(),
        "players.$[].hp": gameState.players.map((p) => p.hp),
        "players.$[].cards": gameState.players.map((p) =>
          p.cards.map(transformCardForDatabase)
        ),
        "players.$[].powerUps": gameState.players.map((p) => p.powerUps),
        "players.$[].activatedSpells": gameState.players.map((p) =>
          p.activatedSpells.map(transformSpellForDatabase)
        ),
        deck: gameState.deck.map(transformCardForDatabase),
      };

      // Only add selectedCard if it exists and is valid
      if (gameState.selectedCard && gameState.selectedCard.id) {
        // Filter out undefined values to prevent cast errors
        const selectedCardData = {
          id: gameState.selectedCard.id,
          type: gameState.selectedCard.type,
          question: gameState.selectedCard.question,
          choices: gameState.selectedCard.choices,
          answer: gameState.selectedCard.answer,
          bloom_level: gameState.selectedCard.bloom_level,
        };

        // Only add optional fields if they have values
        if (gameState.selectedCard.spell_type)
          selectedCardData.spell_type = gameState.selectedCard.spell_type;
        if (gameState.selectedCard.name)
          selectedCardData.name = gameState.selectedCard.name;
        if (gameState.selectedCard.description)
          selectedCardData.description = gameState.selectedCard.description;
        if (gameState.selectedCard.icon)
          selectedCardData.icon = gameState.selectedCard.icon;
        if (gameState.selectedCard.color)
          selectedCardData.color = gameState.selectedCard.color;
        if (gameState.selectedCard.bgColor)
          selectedCardData.bgColor = gameState.selectedCard.bgColor;

        updateData.selectedCard = selectedCardData;
      }

      await GameRoom.findOneAndUpdate(
        { roomId: gameState.roomId },
        { $set: updateData },
        { new: true }
      );

      console.log(
        "✅ Database updated successfully for room:",
        gameState.roomId
      );
    } catch (error) {
      console.error("Error updating game in database:", error);
      console.error("❌ Game data that failed to save:", {
        roomId: gameState.roomId,
        selectedCard: gameState.selectedCard
          ? { id: gameState.selectedCard.id, type: gameState.selectedCard.type }
          : null,
        error: error.message,
      });
    }
  }

  // Use imported getDamageByBloomLevel function
  getDamageByBloomLevel = getDamageByBloomLevel;

  // Process star rewards/penalties when game ends
  async processGameEndRewards(gameState) {
    try {
      console.log("⭐ Processing game end rewards...");

      const winner = gameState.players.find(
        (p) => String(p.userId) === String(gameState.winner)
      );
      const loser = gameState.players.find(
        (p) => String(p.userId) !== String(gameState.winner)
      );

      if (!winner || !loser) {
        console.error("❌ Winner or loser not found in game state");
        return;
      }

      console.log("🏆 Game results:", {
        winner: { id: winner.userId, name: winner.name },
        loser: { id: loser.userId, name: loser.name },
      });

      // Create PvP match record
      const matchData = {
        roomId: gameState.roomId,
        gameId: gameState.gameId,
        player1Id: gameState.players[0].userId,
        player2Id: gameState.players[1].userId,
        winnerId: gameState.winner,
        player1Score: gameState.players[0].hp, // Final HP as score
        player2Score: gameState.players[1].hp,
        player1CorrectAnswers: 0, // We don't track this in the current system
        player2CorrectAnswers: 0,
        totalQuestions: 1, // We don't track total questions in current system
        matchDuration: 0, // We don't track duration in current system
      };

      // Create and save the match record
      const match = new PvPMatch({
        player1: matchData.player1Id,
        player2: matchData.player2Id,
        winner: matchData.winnerId,
        player1Score: matchData.player1Score,
        player2Score: matchData.player2Score,
        player1CorrectAnswers: matchData.player1CorrectAnswers,
        player2CorrectAnswers: matchData.player2CorrectAnswers,
        totalQuestions: matchData.totalQuestions,
        matchDuration: matchData.matchDuration,
        gameMode: "demo", // This is the demo game mode
        roomId: matchData.roomId,
        gameId: matchData.gameId,
        status: "completed",
        completedAt: new Date(),
      });

      // Calculate points changes (±8 stars)
      match.calculatePointsChange();

      // Update player PvP stars
      const [player1, player2] = await Promise.all([
        Student.findById(matchData.player1Id),
        Student.findById(matchData.player2Id),
      ]);

      if (player1 && player2) {
        // Initialize pvpStars if not exists
        if (player1.pvpStars === undefined) player1.pvpStars = 0;
        if (player2.pvpStars === undefined) player2.pvpStars = 0;

        const oldPlayer1Stars = player1.pvpStars;
        const oldPlayer2Stars = player2.pvpStars;

        // Update stars with bounds checking (0-500 range)
        player1.pvpStars = Math.max(
          0,
          Math.min(500, player1.pvpStars + match.player1PointsChange)
        );
        player2.pvpStars = Math.max(
          0,
          Math.min(500, player2.pvpStars + match.player2PointsChange)
        );

        await Promise.all([player1.save(), player2.save()]);

        console.log("⭐ Star changes applied:", {
          player1: {
            name: player1.firstName + " " + player1.lastName,
            oldStars: oldPlayer1Stars,
            newStars: player1.pvpStars,
            change: match.player1PointsChange,
          },
          player2: {
            name: player2.firstName + " " + player2.lastName,
            oldStars: oldPlayer2Stars,
            newStars: player2.pvpStars,
            change: match.player2PointsChange,
          },
        });
      }

      await match.save();

      console.log("✅ Game end rewards processed successfully");
      console.log(
        `📊 PvP match recorded: ${matchData.player1Id} vs ${matchData.player2Id}, Winner: ${matchData.winnerId}`
      );
      console.log(
        `⭐ Points: ${match.player1PointsChange} vs ${match.player2PointsChange}`
      );
    } catch (error) {
      console.error("❌ Error processing game end rewards:", error);
      // Don't throw error to avoid breaking the game flow
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
