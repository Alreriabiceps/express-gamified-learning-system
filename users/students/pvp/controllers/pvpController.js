const socketService = require('../../../../services/socketService');
const Question = require('../../../../users/admin/question/models/questionModels');

// Store active games in memory
const activeGames = new Map();

// Game state constants
const GAME_STATE = {
  WAITING: 'WAITING',
  RPS: 'RPS',
  SUBJECT_SELECTION: 'SUBJECT_SELECTION',
  CARD_SELECTION: 'CARD_SELECTION',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
};

class Game {
  constructor(lobbyId) {
    this.lobbyId = lobbyId;
    this.players = new Map();
    this.state = GAME_STATE.WAITING;
    this.currentTurn = null;
    this.selectedSubject = null;
    this.questions = [];
    this.rpsChoices = new Map();
    this.playerHands = new Map();
    this.scores = new Map();
  }

  addPlayer(playerId, playerName) {
    if (this.players.size >= 2) {
      throw new Error('Game is full');
    }
    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      hp: 100,
      ready: false
    });
    this.scores.set(playerId, 0);
  }

  setRpsChoice(playerId, choice) {
    this.rpsChoices.set(playerId, choice);
    return this.rpsChoices.size === 2;
  }

  determineRpsWinner() {
    const choices = Array.from(this.rpsChoices.entries());
    const [player1Id, choice1] = choices[0];
    const [player2Id, choice2] = choices[1];

    if (choice1 === choice2) return null;

    const winningMoves = {
      rock: 'scissors',
      paper: 'rock',
      scissors: 'paper'
    };

    return winningMoves[choice1] === choice2 ? player1Id : player2Id;
  }

  setSubject(subject) {
    this.selectedSubject = subject;
    this.state = GAME_STATE.CARD_SELECTION;
  }

  async dealCards(questions) {
    this.questions = questions;
    const players = Array.from(this.players.keys());
    
    // Split questions between players
    const midPoint = Math.floor(questions.length / 2);
    this.playerHands.set(players[0], questions.slice(0, midPoint));
    this.playerHands.set(players[1], questions.slice(midPoint));
    
    this.state = GAME_STATE.IN_PROGRESS;
  }

  handleAnswer(playerId, questionId, answer) {
    const question = this.questions.find(q => q._id.toString() === questionId);
    if (!question) return false;

    const isCorrect = answer === question.correctAnswer;
    if (isCorrect) {
      this.scores.set(playerId, (this.scores.get(playerId) || 0) + 1);
    }

    return isCorrect;
  }

  isGameOver() {
    return Array.from(this.players.values()).some(player => player.hp <= 0);
  }

  getWinner() {
    const players = Array.from(this.players.values());
    return players.find(player => player.hp > 0)?.id;
  }
}

// Create a new game
exports.createGame = async (lobbyId) => {
  try {
    const game = new Game(lobbyId);
    activeGames.set(lobbyId, game);
    return game;
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
};

// Join a game
exports.joinGame = async (lobbyId, playerId, playerName) => {
  try {
    const game = activeGames.get(lobbyId);
    if (!game) {
      throw new Error('Game not found');
    }

    game.addPlayer(playerId, playerName);
    
    if (game.players.size === 2) {
      game.state = GAME_STATE.RPS;
      socketService.emitEvent('game_ready', { lobbyId });
    }

    return game;
  } catch (error) {
    console.error('Error joining game:', error);
    throw error;
  }
};

// Handle RPS choice
exports.handleRpsChoice = async (lobbyId, playerId, choice) => {
  try {
    const game = activeGames.get(lobbyId);
    if (!game) {
      throw new Error('Game not found');
    }

    const allChoicesMade = game.setRpsChoice(playerId, choice);
    if (allChoicesMade) {
      const winner = game.determineRpsWinner();
      if (winner) {
        game.currentTurn = winner;
        game.state = GAME_STATE.SUBJECT_SELECTION;
      }
      return { winner };
    }
    return null;
  } catch (error) {
    console.error('Error handling RPS choice:', error);
    throw error;
  }
};

// Handle subject selection
exports.handleSubjectSelection = async (lobbyId, subject) => {
  try {
    const game = activeGames.get(lobbyId);
    if (!game) {
      throw new Error('Game not found');
    }

    game.setSubject(subject);

    // Fetch questions for the selected subject
    const questions = await Question.find({ subject: subject.id })
      .select('questionText choices correctAnswer')
      .limit(10);

    await game.dealCards(questions);

    return game;
  } catch (error) {
    console.error('Error handling subject selection:', error);
    throw error;
  }
};

// Handle answer submission
exports.handleAnswerSubmission = async (lobbyId, playerId, questionId, answer) => {
  try {
    const game = activeGames.get(lobbyId);
    if (!game) {
      throw new Error('Game not found');
    }

    const isCorrect = game.handleAnswer(playerId, questionId, answer);
    
    if (game.isGameOver()) {
      game.state = GAME_STATE.COMPLETED;
      const winner = game.getWinner();
      return { isCorrect, gameOver: true, winner };
    }

    return { isCorrect, gameOver: false };
  } catch (error) {
    console.error('Error handling answer submission:', error);
    throw error;
  }
};

// End game
exports.endGame = async (lobbyId) => {
  try {
    const game = activeGames.get(lobbyId);
    if (!game) {
      throw new Error('Game not found');
    }

    game.state = GAME_STATE.COMPLETED;
    activeGames.delete(lobbyId);

    return { message: 'Game ended successfully' };
  } catch (error) {
    console.error('Error ending game:', error);
    throw error;
  }
};

// Clean up disconnected player
exports.handleDisconnect = async (playerId) => {
  try {
    for (const [lobbyId, game] of activeGames.entries()) {
      if (game.players.has(playerId)) {
        game.state = GAME_STATE.COMPLETED;
        const otherPlayerId = Array.from(game.players.keys())
          .find(id => id !== playerId);
        
        if (otherPlayerId) {
          socketService.emitEvent('player_disconnected', {
            lobbyId,
            disconnectedPlayer: playerId
          });
        }
        
        activeGames.delete(lobbyId);
      }
    }
  } catch (error) {
    console.error('Error handling disconnect:', error);
    throw error;
  }
}; 