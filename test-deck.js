const CardManager = require("./services/cards/CardManager");

async function testDeck() {
  try {
    const cardManager = new CardManager();
    const { deck, transformedQuestions } = await cardManager.createGameDeck();

    console.log("Questions found:", transformedQuestions.length);
    console.log("Deck size:", deck.length);
    console.log(
      "First 5 cards:",
      deck.slice(0, 5).map((c) => ({
        id: c.id,
        question: c.question?.substring(0, 50) + "...",
        bloomLevel: c.bloomLevel,
      }))
    );

    // Test card distribution
    const { player1Cards, player2Cards } = cardManager.distributeCardsToPlayers(
      [...deck]
    );
    console.log("Player 1 cards:", player1Cards.length);
    console.log("Player 2 cards:", player2Cards.length);
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

testDeck();
