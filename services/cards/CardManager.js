const Question = require("../../users/admin/question/models/questionModels");
const { RARITY_WEIGHTS, GAME_CONFIG } = require("../constants/gameConstants");
const {
  shuffleArray,
  normalizeBloomLevel,
  getDamageByBloomLevel,
} = require("../utils/gameUtils");

class CardManager {
  constructor() {
    this.shuffleArray = shuffleArray;
    this.normalizeBloomLevel = normalizeBloomLevel;
    this.getDamageByBloomLevel = getDamageByBloomLevel;
  }

  // Create weighted deck with improved rarity distribution
  createWeightedDeck(questionCards) {
    const deck = [];

    // Add question cards with weighted distribution
    questionCards.forEach((card) => {
      const weight = RARITY_WEIGHTS[card.bloom_level] || 5;
      // Add multiple copies based on weight
      for (let i = 0; i < weight; i++) {
        const newCard = { ...card, id: `${card.id}_${i}` };
        deck.push(newCard);
      }
    });

    // Shuffle the weighted deck
    return this.shuffleArray(deck);
  }

  // Create game deck with questions
  async createGameDeck() {
    // Fetch questions from database
    let questions = await Question.find({}).lean();
    console.log(`Found ${questions.length} questions in database`);

    // No mock data - only use real database questions
    if (!questions || questions.length === 0) {
      throw new Error(
        "No questions found in database. Please add questions to the database first."
      );
    }

    // Transform questions to game format
    const transformedQuestions = questions
      .filter((question) => {
        // Only include questions with valid questionText
        return question.questionText;
      })
      .map((question, index) => {
        const originalBloomLevel = question.bloomsLevel;
        const bloomLevel = this.normalizeBloomLevel(question.bloomsLevel);

        // Debug logging for Bloom's level mapping
        if (originalBloomLevel !== bloomLevel) {
          console.log(
            `🔄 Bloom's level mapped: "${originalBloomLevel}" -> "${bloomLevel}"`
          );
        }

        const damage = this.getDamageByBloomLevel(bloomLevel);
        const transformedCard = {
          id: String(question._id || index),
          type: `bloom-${bloomLevel.toLowerCase()}`,
          question: question.questionText,
          choices: question.choices || [],
          answer: question.correctAnswer,
          bloom_level: bloomLevel,
          bloomLevel: bloomLevel, // Add bloomLevel for frontend compatibility
          damage: damage, // Add damage field
          subject: "General", // Default subject since we don't have subject details in this context
          difficulty: "medium", // Default difficulty
        };

        // Debug logging for damage calculation
        console.log(`🃏 Card created with damage:`, {
          id: transformedCard.id,
          bloomLevel: bloomLevel,
          damage: damage,
          question: question.questionText.substring(0, 50) + "...",
        });

        return transformedCard;
      });

    // Create weighted deck with improved rarity distribution
    const deck = this.createWeightedDeck(transformedQuestions);

    console.log("🃏 Using REAL database questions only - NO MOCK DATA");

    return { deck, transformedQuestions };
  }

  // Distribute cards to players
  distributeCardsToPlayers(deck) {
    const player1Cards = [];
    const player2Cards = [];

    console.log(`🃏 Distributing cards - Deck size: ${deck.length}`);

    // Deal initial cards to each player (5 cards each)
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

    console.log(
      `🃏 Initial cards dealt - Player1: ${player1Cards.length}, Player2: ${player2Cards.length}`
    );

    console.log(
      `🃏 Final cards - Player1: ${player1Cards.length}, Player2: ${player2Cards.length}`
    );
    console.log(
      `🃏 Player1 cards:`,
      player1Cards.map((c) => ({ id: c.id, name: c.name, type: c.type }))
    );
    console.log(
      `🃏 Player2 cards:`,
      player2Cards.map((c) => ({ id: c.id, name: c.name, type: c.type }))
    );

    return { player1Cards, player2Cards };
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
}

module.exports = CardManager;
