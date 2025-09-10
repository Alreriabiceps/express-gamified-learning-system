const GameRoom = require("../models/GameRoom");
const PvPMatch = require("../users/students/pvp/models/pvpMatchModel");
const Student = require("../users/admin/student/models/studentModels");
const mongoose = require("mongoose");

// Import new modular components
const GameState = require("./core/GameState");
const CardManager = require("./cards/CardManager");
const EffectProcessor = require("./effects/EffectProcessor");

// Import constants and utilities
const {
  GAME_CONFIG,
  BLOOM_CONFIG,
  GAME_STATES,
  GAME_PHASES,
  ACTION_TYPES,
} = require("./constants/gameConstants");

const { transformCardForDatabase } = require("./utils/gameUtils");

class GameEngine {
  constructor() {
    this.games = new Map();
    // Map a lobbyId -> latest active roomId
    this.lobbyToRoom = new Map();
    // Simple per-lobby init lock to avoid double initialization
    this.initializationLocks = new Set();

    // Initialize modular components
    this.cardManager = new CardManager();
  }

  // These methods are now handled by CardManager

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

      // Create deck and cards using CardManager
      const { deck, transformedQuestions } =
        await this.cardManager.createGameDeck();

      // Distribute cards to players using CardManager
      const { player1Cards, player2Cards } =
        this.cardManager.distributeCardsToPlayers(deck);

      // Create game state using GameState class
      const gameState = new GameState(
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

      // First player starts with 6 cards, second player with 5 cards
      console.log(
        "🎮 Game initialized - First player starts with 6 cards, second player with 5 cards"
      );

      // Save to database
      await this.saveGameStateToDatabase(gameState, lobbyId);

      // Store in memory for quick access
      this.games.set(roomId, gameState);
      this.lobbyToRoom.set(String(lobbyId), roomId);
      console.log("Game state stored in memory");

      // Clean up the lobby since the game has started
      await this.cleanupLobby(lobbyId);

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

  // These methods are now handled by CardManager and other components

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

  // These methods are now handled by CardManager and GameState classes

  // Save game state to database
  async saveGameStateToDatabase(gameState, lobbyId) {
    console.log("💾 Saving game state to database...");
    console.log("📋 Room ID:", gameState.roomId);
    console.log("📋 Lobby ID:", lobbyId);

    // Process lobbyId for database
    const processedLobbyId = this.processLobbyIdForDatabase(lobbyId);
    console.log("📋 Processed Lobby ID:", processedLobbyId);

    // Prepare game state for database
    const gameStateForDB = this.prepareGameStateForDatabase(
      gameState,
      processedLobbyId
    );
    console.log("📋 Prepared game state for DB:", {
      roomId: gameStateForDB.roomId,
      gameId: gameStateForDB.gameId,
      playersCount: gameStateForDB.players?.length,
      deckCount: gameStateForDB.deck?.length,
    });

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

      // Verify the save by querying the database
      const verification = await GameRoom.findOne({ roomId: gameState.roomId });
      if (verification) {
        console.log(
          "✅ Verification successful - game state found in database"
        );
      } else {
        console.error(
          "❌ Verification failed - game state not found in database"
        );
      }
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
    console.log("🔍 Preparing game state for database:", {
      roomId: gameState.roomId,
      playersCount: gameState.players?.length,
      firstPlayerCards: gameState.players?.[0]?.cards?.length || 0,
      deckLength: gameState.deck?.length || 0,
    });

    // Deep clone the game state to avoid mutation issues
    const preparedState = JSON.parse(
      JSON.stringify({
        ...gameState,
        lobbyId: processedLobbyId,
        players: gameState.players.map((player) => {
          const transformedCards = player.cards
            ? player.cards.map(transformCardForDatabase)
            : [];
          console.log(`🔄 Transforming player ${player.userId} cards:`, {
            originalCount: player.cards?.length || 0,
            transformedCount: transformedCards.length,
            firstCard: transformedCards[0] || "none",
          });

          return {
            ...player,
            cards: transformedCards,
          };
        }),
        deck: gameState.deck
          ? gameState.deck.map(transformCardForDatabase)
          : [],
      })
    );

    console.log("✅ Game state prepared for database:", {
      roomId: preparedState.roomId,
      playersCount: preparedState.players?.length,
      firstPlayerCards: preparedState.players?.[0]?.cards?.length || 0,
      deckLength: preparedState.deck?.length || 0,
    });

    return preparedState;
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
    try {
      console.log("🔄 Processing action:", { roomId, playerId, action });

      const gameState = this.games.get(roomId);
      if (!gameState) {
        throw new Error("Game not found");
      }

      console.log("🎮 Game state found:", {
        roomId: gameState.roomId,
        currentTurn: gameState.currentTurn,
        gamePhase: gameState.gamePhase,
        playersCount: gameState.players?.length,
        playerIds: gameState.players?.map((p) => ({
          userId: p.userId,
          name: p.name,
        })),
      });

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
    } catch (error) {
      console.error("❌ Error in processAction:", error);
      console.error("❌ Action details:", { roomId, playerId, action });
      throw error;
    }
  }

  // Process card selection
  processSelectCard(gameState, playerId, cardId, cardData = null) {
    try {
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
        // Graceful fallback: if client provided the full card data, use it
        if (cardData) {
          console.warn(
            "⚠️ Card id not found; falling back to provided card data.",
            {
              requestedCardId: cardId,
              providedCardId: cardData.id,
              providedType: cardData.type,
            }
          );

          // Normalize minimal fields we need
          card = {
            id: String(cardData.id || cardId || `client_${Date.now()}`),
            type: cardData.type || "question",
            question:
              cardData.question || cardData.questionText || cardData.name || "",
            choices: cardData.choices || [],
            answer: cardData.answer || cardData.correctAnswer || "",
            bloom_level:
              cardData.bloom_level ||
              cardData.bloomLevel ||
              cardData.bloomsLevel ||
              "",
            name: cardData.name,
            damage: cardData.damage,
          };
        } else {
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
      }

      console.log("✅ Card found successfully:", {
        cardId: card.id,
        type: card.type,
      });

      // Remove the card from player's hand (tolerant by id or by question/name)
      const initialCount = player.cards.length;
      let removed = false;
      // Try strict id removal
      const afterIdRemoval = player.cards.filter(
        (c) => String(c.id) !== String(cardId)
      );
      if (afterIdRemoval.length !== initialCount) {
        player.cards = afterIdRemoval;
        removed = true;
      } else {
        // Try by question/name match as fallback
        const idx = player.cards.findIndex(
          (c) =>
            (c.question && card.question && c.question === card.question) ||
            (c.name && card.name && c.name === card.name)
        );
        if (idx >= 0) {
          player.cards.splice(idx, 1);
          removed = true;
        }
      }
      console.log("🗑️ Card removal status:", {
        playerId,
        attemptedId: cardId,
        removed,
        remainingCards: player.cards.length,
      });

      gameState.selectedCard = card;
      gameState.gamePhase = GAME_PHASES.ANSWERING;

      // Draw a card for the opponent when current player uses a card
      const opponent = gameState.players.find(
        (p) => String(p.userId) !== String(playerId)
      );
      if (opponent && gameState.deck.length > 0) {
        this.cardManager.drawCardForPlayer(gameState, opponent);
        console.log(
          `🃏 Drew card for opponent ${opponent.name} after ${player.name} used a card`
        );
      }

      // Update database
      this.updateGameInDatabase(gameState);

      return {
        type: "card_selected",
        card,
        gameState,
      };
    } catch (error) {
      console.error("❌ Error in processSelectCard:", error);
      console.error("❌ Card selection details:", {
        roomId: gameState.roomId,
        playerId,
        cardId,
        cardData: cardData ? { id: cardData.id, type: cardData.type } : null,
      });
      throw error;
    }
  }

  // Process answer to question
  async processAnswerQuestion(gameState, playerId, answer) {
    try {
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

      // Increment total questions counter
      gameState.totalQuestions += 1;

      // Track correct answers for the answering player
      const answeringPlayer = gameState.players.find(
        (p) => String(p.userId) === String(playerId)
      );
      if (answeringPlayer && isCorrect) {
        answeringPlayer.correctAnswers += 1;
        console.log(
          `✅ ${answeringPlayer.name} answered correctly! Total correct: ${answeringPlayer.correctAnswers}`
        );
      }

      // Calculate damage
      const baseDamage = this.calculateDamage(
        selectedCard,
        isCorrect,
        gameState
      );
      const opponentPlayer = gameState.players.find(
        (p) => String(p.userId) !== String(playerId)
      );

      console.log("🔍 Damage calculation details:", {
        selectedCard: {
          id: selectedCard.id,
          bloom_level: selectedCard.bloom_level,
          bloomLevel: selectedCard.bloomLevel,
          damage: selectedCard.damage,
        },
        baseDamage,
        isCorrect,
      });

      const damage = EffectProcessor.processDamageEffects(
        gameState,
        playerId,
        opponentPlayer.userId,
        baseDamage
      ).damage;

      console.log("💥 Final damage after effects:", damage);

      // If answer is correct, opponent takes damage. If wrong, answering player takes damage.
      const targetPlayer = isCorrect ? opponentPlayer : answeringPlayer;

      const oldHp = targetPlayer.hp;
      targetPlayer.hp = Math.max(0, targetPlayer.hp - damage);

      // Validate HP values
      if (targetPlayer.hp < 0 || targetPlayer.hp > targetPlayer.maxHp) {
        console.error(
          `❌ Invalid HP value for ${targetPlayer.name}: ${targetPlayer.hp}`
        );
        targetPlayer.hp = Math.max(
          0,
          Math.min(targetPlayer.hp, targetPlayer.maxHp)
        );
      }

      console.log("💥 Damage applied:", {
        targetPlayer: targetPlayer.name,
        damage,
        oldHp,
        newHp: targetPlayer.hp,
        isCorrect,
        answeringPlayer: answeringPlayer.name,
        opponentPlayer: opponentPlayer.name,
      });

      console.log("🎯 Current game state HP values:", {
        player1: {
          name: gameState.players[0].name,
          hp: gameState.players[0].hp,
        },
        player2: {
          name: gameState.players[1].name,
          hp: gameState.players[1].hp,
        },
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

        // Note: Card drawing is now handled when cards are selected, not when turns switch
      }

      // Update database
      await this.updateGameInDatabase(gameState);

      return {
        type: "answer_processed",
        isCorrect,
        damage,
        answer,
        gameState,
        selectedCard: selectedCard, // Preserve the selected card data for the result popup
      };
    } catch (error) {
      console.error("❌ Error in processAnswerQuestion:", error);
      console.error("❌ Answer processing details:", {
        playerId,
        answer,
        selectedCard: gameState.selectedCard
          ? {
              id: gameState.selectedCard.id,
              question: gameState.selectedCard.question,
            }
          : null,
        gameState: {
          roomId: gameState.roomId,
          currentTurn: gameState.currentTurn,
          gamePhase: gameState.gamePhase,
        },
      });
      throw error;
    }
  }

  // Calculate damage based on Bloom's level
  calculateDamage(card, isCorrect, gameState) {
    console.log("🔍 Calculating damage for card:", {
      cardId: card.id,
      bloom_level: card.bloom_level,
      bloomLevel: card.bloomLevel,
      cardDamage: card.damage,
      availableBloomLevels: Object.keys(BLOOM_CONFIG),
      damageFromConfig: BLOOM_CONFIG[card.bloom_level]?.damage,
      damageFromBloomLevel: BLOOM_CONFIG[card.bloomLevel]?.damage,
    });

    // Use the damage that was already calculated and stored in the card
    // This ensures consistency with the card creation process
    const damage = card.damage || 5;

    console.log("💥 Final damage calculated:", damage);
    return damage;
  }

  // Removed unused power-up processing methods - not currently implemented

  // Update game in database
  async updateGameInDatabase(gameState) {
    try {
      // Update each player individually to ensure proper HP and cards update
      const updatePromises = gameState.players.map((player, index) => {
        // Ensure cards are properly transformed
        console.log(`🔍 Player ${index} cards before transformation:`, {
          cardsType: typeof player.cards,
          isArray: Array.isArray(player.cards),
          length: player.cards?.length,
          firstCard: player.cards?.[0],
          firstCardType: typeof player.cards?.[0],
        });

        const transformedCards = player.cards
          ? player.cards
              .map((card) => {
                console.log(`🔍 Processing card:`, {
                  card,
                  cardType: typeof card,
                  isObject: typeof card === "object" && card !== null,
                });

                // Ensure card is an object and transform it
                if (typeof card === "object" && card !== null) {
                  const transformed = transformCardForDatabase(card);
                  console.log(`✅ Transformed card:`, transformed);
                  return transformed;
                } else {
                  console.warn(
                    `⚠️ Invalid card data for player ${index}:`,
                    card
                  );
                  return null;
                }
              })
              .filter((card) => card !== null)
          : [];

        console.log(`🔄 Updating player ${index} cards:`, {
          originalCardsCount: player.cards?.length || 0,
          transformedCardsCount: transformedCards.length,
          firstCard: transformedCards[0] || "none",
          cardTypes: transformedCards.map((c) => typeof c),
        });

        return GameRoom.updateOne(
          { roomId: gameState.roomId },
          {
            $set: {
              [`players.${index}.hp`]: player.hp,
              [`players.${index}.maxHp`]: player.maxHp,
              [`players.${index}.cards`]: transformedCards,
              [`players.${index}.correctAnswers`]: player.correctAnswers || 0,
            },
          }
        ).catch((error) => {
          console.error(
            `❌ Error updating player ${index} in database:`,
            error
          );
          console.error(`❌ Player data:`, {
            userId: player.userId,
            hp: player.hp,
            cardsCount: transformedCards.length,
            firstCard: transformedCards[0],
          });
          throw error;
        });
      });

      // Wait for all player updates to complete
      await Promise.all(updatePromises);

      // Update other game state fields
      const updateData = {
        currentTurn: gameState.currentTurn,
        gamePhase: gameState.gamePhase,
        gameState: gameState.gameState,
        winner: gameState.winner,
        lastActivity: new Date(),
        deck: gameState.deck.map(transformCardForDatabase),
        totalQuestions: gameState.totalQuestions,
        matchStartTime: gameState.matchStartTime,
        matchDuration: gameState.matchDuration,
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

      // Update the remaining game state fields
      await GameRoom.updateOne(
        { roomId: gameState.roomId },
        { $set: updateData }
      );

      console.log("✅ Game state updated in database successfully");
    } catch (error) {
      console.error("❌ Error updating game in database:", error);
      console.error("❌ Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        roomId: gameState.roomId,
        playersCount: gameState.players?.length,
      });
      throw error;
    }
  }

  // getDamageByBloomLevel is now handled by CardManager

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

      // Calculate match duration
      const matchDuration = Date.now() - gameState.matchStartTime;
      gameState.matchDuration = matchDuration;

      console.log("🏆 Game results:", {
        winner: {
          id: winner.userId,
          name: winner.name,
          correctAnswers: winner.correctAnswers,
        },
        loser: {
          id: loser.userId,
          name: loser.name,
          correctAnswers: loser.correctAnswers,
        },
        totalQuestions: gameState.totalQuestions,
        matchDuration: Math.round(matchDuration / 1000) + " seconds",
      });

      // Create PvP match record
      const matchData = {
        roomId: gameState.roomId,
        gameId: gameState.gameId,
        player1Id: gameState.players[0].userId,
        player2Id: gameState.players[1].userId,
        winnerId: gameState.winner,
        player1Score: gameState.players[0].correctAnswers, // Use correct answers as score
        player2Score: gameState.players[1].correctAnswers, // Use correct answers as score
        player1CorrectAnswers: gameState.players[0].correctAnswers,
        player2CorrectAnswers: gameState.players[1].correctAnswers,
        totalQuestions: gameState.totalQuestions,
        matchDuration: matchDuration,
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

  // Clear all games (for testing purposes)
  clearAllGames() {
    console.log("🧹 Clearing all games from memory...");
    this.games.clear();
    this.lobbyToRoom.clear();
    this.initializationLocks.clear();
    console.log("✅ All games cleared from memory");
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

  // Clean up lobby when game starts
  async cleanupLobby(lobbyId) {
    try {
      const Lobby = require("../users/students/lobby/models/lobbyModel");
      const socketService = require("../services/socketService");

      console.log("🧹 Cleaning up lobby:", lobbyId);

      // Delete the lobby from database
      const deletedLobby = await Lobby.findByIdAndDelete(lobbyId);

      if (deletedLobby) {
        console.log("✅ Lobby deleted successfully:", lobbyId);

        // Emit lobby deletion event to notify all clients
        socketService.emitEvent("lobby:deleted", {
          lobbyId: lobbyId,
          reason: "game_started",
        });

        // Also emit to specific lobby room if it exists
        // Note: Socket emission will be handled by the socketService
      } else {
        console.log("⚠️ Lobby not found for cleanup:", lobbyId);
      }
    } catch (error) {
      console.error("❌ Error cleaning up lobby:", error);
      // Don't throw error - game should continue even if lobby cleanup fails
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
