const {
  GAME_CONFIG,
  GAME_PHASES,
  GAME_STATES,
} = require("../constants/gameConstants");

class GameState {
  constructor(roomId, players, lobbyId, player1Cards, player2Cards, deck) {
    this.roomId = roomId;
    this.gameId = `game_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    this.lobbyId = lobbyId;
    this.players = this.initializePlayers(players, player1Cards, player2Cards);
    this.currentTurn = players[0].userId; // First player goes first

    // Give the first player (who goes first) an extra card
    this.giveFirstPlayerExtraCard(deck);

    this.gamePhase = GAME_PHASES.CARD_SELECTION;
    this.deck = deck;
    this.selectedCard = null;
    this.gameState = GAME_STATES.PLAYING;
    this.winner = null;
    this.totalQuestions = 0; // Track total questions asked in the game
    this.matchStartTime = Date.now(); // Track when the match started
    this.matchDuration = 0; // Will be calculated when game ends
  }

  initializePlayers(players, player1Cards, player2Cards) {
    return [
      {
        userId: String(players[0].userId || ""),
        username: String(players[0].username || players[0].name || "Player"),
        name: String(players[0].name || players[0].username || "Player"),
        firstName: players[0].firstName || "",
        lastName: players[0].lastName || "",
        hp: GAME_CONFIG.INITIAL_HP,
        maxHp: GAME_CONFIG.INITIAL_HP,
        cards: player1Cards,
        correctAnswers: 0, // Track correct answers for this player
      },
      {
        userId: String(players[1].userId || ""),
        username: String(players[1].username || players[1].name || "Player"),
        name: String(players[1].name || players[1].username || "Player"),
        firstName: players[1].firstName || "",
        lastName: players[1].lastName || "",
        hp: GAME_CONFIG.INITIAL_HP,
        maxHp: GAME_CONFIG.INITIAL_HP,
        cards: player2Cards,
        correctAnswers: 0, // Track correct answers for this player
      },
    ];
  }

  giveFirstPlayerExtraCard(deck) {
    // Find the first player (who goes first)
    const firstPlayer = this.players.find((p) => p.userId === this.currentTurn);

    if (firstPlayer && deck.length > 0) {
      const extraCard = deck.pop();
      firstPlayer.cards.push(extraCard);
      console.log(
        `🃏 Extra card given to first player ${firstPlayer.name} (${firstPlayer.userId}) for going first: ${extraCard.id}`
      );
      console.log(
        `🃏 First player now has ${
          firstPlayer.cards.length
        } cards, second player has ${
          this.players.find((p) => p.userId !== this.currentTurn).cards.length
        } cards`
      );
    }
  }

  updatePlayer(playerId, updates) {
    const player = this.players.find((p) => p.userId === playerId);
    if (player) {
      Object.assign(player, updates);
      return true;
    }
    return false;
  }

  getPlayer(playerId) {
    return this.players.find((p) => p.userId === playerId);
  }

  getOpponent(playerId) {
    return this.players.find((p) => p.userId !== playerId);
  }

  switchTurn() {
    const currentPlayer = this.getPlayer(this.currentTurn);
    const opponent = this.getOpponent(this.currentTurn);
    this.currentTurn = opponent.userId;
    return { currentPlayer, opponent };
  }

  calculateMatchDuration() {
    this.matchDuration = Date.now() - this.matchStartTime;
    return this.matchDuration;
  }

  isGameOver() {
    return this.players.some((player) => player.hp <= 0);
  }

  getWinner() {
    if (this.isGameOver()) {
      return this.players.find((player) => player.hp > 0);
    }
    return null;
  }

  endGame() {
    this.gameState = GAME_STATES.FINISHED;
    this.winner = this.getWinner()?.userId || null;
    this.calculateMatchDuration();
  }
}

module.exports = GameState;
