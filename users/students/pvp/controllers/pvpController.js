const socketService = require('../../../../services/socketService');
// const Game = require('../../../../models/Game'); // Remove this incorrect import
const GAME_STATE = require('../constants/gameStates'); // Correct relative path
const Question = require('../../../admin/question/models/questionModels');

// Store active games in memory
const activeGames = new Map();

// Rename the local class to avoid conflict with the imported Game model
class PvpGameInstance {
  constructor(lobbyId) {
    this.lobbyId = lobbyId;
    this.players = new Map(); // Stores player objects { id, name, hp, joinedAt, deck, hand }
    this.state = GAME_STATE.WAITING;
    this.currentTurn = null; // ID of the player whose turn it is
    this.selectedSubject = null;
    // Rework card/question storage:
    // this.questions = []; // Remove this - questions will be in decks/hands
    this.playerDecks = new Map(); // Map playerId -> array of card objects (full deck)
    this.playerHands = new Map(); // Map playerId -> array of card objects (current hand)
    this.currentSummonedCard = null; // Track the question card played this turn
    this.rpsChoices = new Map();
    this.playerDiceRolls = new Map();

    // Turn tracking flags
    this.hasSummonedQuestionThisTurn = false;
    this.hasPlayedSpellEffectThisTurn = false;
    
    this.createdAt = Date.now();
    console.log('New game instance created:', { lobbyId, createdAt: this.createdAt });
  }

  addPlayer(playerId, playerName) {
    console.log('Adding player to game:', { lobbyId: this.lobbyId, playerId, playerName, existingPlayers: this.players.size });
    
    // Check if player is already in the game
    if (this.players.has(playerId)) {
      console.log('Player already in game:', { playerId, playerName });
      return false;
    }

    if (this.players.size >= 2) {
      console.log('Game is full:', { lobbyId: this.lobbyId, players: Array.from(this.players.keys()) });
      throw new Error('Game is full');
    }

    // Initialize player data structure
    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      hp: 20, // Starting HP set to 20
      // deck and hand will be populated later
      joinedAt: Date.now()
    });
    // Initialize empty deck and hand
    this.playerDecks.set(playerId, []);
    this.playerHands.set(playerId, []);
    
    console.log('Player successfully added:', { 
      playerId, 
      playerName, 
      initialHp: this.players.get(playerId).hp,
      totalPlayers: this.players.size,
      allPlayers: this.getPlayers()
    });
    return true;
  }

  // --- Helper to reset turn flags ---
  _resetTurnFlags() {
    this.hasSummonedQuestionThisTurn = false;
    this.hasPlayedSpellEffectThisTurn = false;
    console.log(`[Lobby ${this.lobbyId}] Turn flags reset.`);
  }

  // --- Helper to switch turn and reset flags ---
  _switchToNextTurn(nextPlayerId) {
    console.log(`[Lobby ${this.lobbyId}] Switching turn from ${this.currentTurn} to ${nextPlayerId}`);
    this.currentTurn = nextPlayerId;
    this._resetTurnFlags();
    // Potentially trigger draw card for the new player here?
    // this.drawCard(this.currentTurn); // Needs drawCard implementation first
  }

  getPlayers() {
    const players = Array.from(this.players.entries()).map(([id, player]) => ({
      id,
      name: player.name,
      hp: player.hp, // Include HP
      joinedAt: player.joinedAt
    }));
    console.log('Getting players:', { 
      lobbyId: this.lobbyId, 
      count: players.length, 
      players: players 
    });
    return players;
  }

  setRpsChoice(playerId, choice) {
    console.log('Setting RPS choice:', { playerId, choice });
    this.rpsChoices.set(playerId, choice);
    return this.rpsChoices.size === 2;
  }

  getRpsChoices() {
    return Array.from(this.rpsChoices.entries());
  }

  determineRpsWinner() {
    const choices = Array.from(this.rpsChoices.entries());
    if (choices.length !== 2) {
      return { winner: null, isDraw: false };
    }

    const [player1Id, choice1] = choices[0];
    const [player2Id, choice2] = choices[1];

    console.log('Determining RPS winner from choices:', {
      player1: { id: player1Id, choice: choice1 },
      player2: { id: player2Id, choice: choice2 }
    });

    if (choice1 === choice2) {
      this.clearRpsChoices(); // Clear choices for next round
      return {
        isDraw: true,
        winner: null,
        choices: [
          { playerId: player1Id, choice: choice1 },
          { playerId: player2Id, choice: choice2 }
        ]
      };
    }

    const winningMoves = {
      rock: 'scissors',
      paper: 'rock',
      scissors: 'paper'
    };

    // Determine winner
    const isPlayer1Winner = winningMoves[choice1] === choice2;
    const winner = isPlayer1Winner ? player1Id : player2Id;
    const loser = isPlayer1Winner ? player2Id : player1Id;

    console.log('Winner determined:', {
      winner,
      loser,
      winningChoice: isPlayer1Winner ? choice1 : choice2,
      losingChoice: isPlayer1Winner ? choice2 : choice1
    });

    // Set game state for subject selection
    this.currentTurn = winner; // Winner of RPS chooses subject
    this.state = GAME_STATE.SUBJECT_SELECTION;

    // Clear choices AFTER winner is determined and state set
    this.clearRpsChoices(); 

    console.log(`[Lobby ${this.lobbyId}] RPS Winner: ${winner}. State -> ${this.state}. Waiting for subject selection.`);

    return {
      isDraw: false,
      winner: winner,
      choices: [
        { playerId: player1Id, choice: choice1 },
        { playerId: player2Id, choice: choice2 }
      ]
    };
  }

  clearRpsChoices() {
    this.rpsChoices.clear();
  }

  canSelectSubject(playerId) {
    return this.state === GAME_STATE.SUBJECT_SELECTION && this.currentTurn === playerId;
  }

  // REWORKED: setSubject now fetches cards, creates decks, deals hands, and transitions to DICE_ROLL
  async setSubject(playerId, subject) {
    if (!this.canSelectSubject(playerId)) {
      throw new Error('Not allowed to select subject at this time');
    }
    console.log(`[Lobby ${this.lobbyId}] Player ${playerId} selected subject: ${subject.name} (ID: ${subject._id})`);
    this.selectedSubject = subject;
    
    try {
      // --- Card Fetching and Deck Creation ---
      console.log(`[Lobby ${this.lobbyId}] Fetching cards for subject ${subject._id}...`);
      // IMPORTANT: Replace fetchCardsBySubject with your actual async function
      // It should return an array of card objects like: { _id: '...', type: 'question'/'spellEffect', text: '...', answer: '...', effect: '...', ... }
      const allSubjectCards = await fetchCardsBySubject(subject._id); 
      console.log(`[Lobby ${this.lobbyId}] Fetched ${allSubjectCards.length} cards for subject.`);

      if (allSubjectCards.length < 15) { // Need enough for at least one deck
          console.error(`[Lobby ${this.lobbyId}] Not enough cards found for subject ${subject._id} to create decks.`);
          throw new Error('Insufficient cards available for the selected subject.');
      }

      // Separate card types
      const questionCards = allSubjectCards.filter(card => card.type === 'question');
      const spellEffectCards = allSubjectCards.filter(card => card.type === 'spellEffect');

      console.log(`[Lobby ${this.lobbyId}] Separated cards: ${questionCards.length} questions, ${spellEffectCards.length} spell/effects.`);

      // Basic check for enough variety
      if (questionCards.length < 10 || spellEffectCards.length < 5) {
           console.warn(`[Lobby ${this.lobbyId}] Warning: Low variety of card types for subject ${subject._id}. Required Q:10, S/E:5`);
           // Decide if this should be an error or just proceed with fewer special cards
           // throw new Error('Insufficient variety of cards for the selected subject.'); 
      }

      const playerIds = Array.from(this.players.keys());
      if (playerIds.length !== 2) {
           throw new Error('Cannot create decks without exactly 2 players.');
      }
      
      const createdDecks = this._createAndAssignDecks(playerIds, questionCards, spellEffectCards);
      if (!createdDecks) {
          // Error handled within _createAndAssignDecks
          throw new Error('Failed to create decks.');
      }
      
      // --- Initial Hand Deal ---
      this._dealInitialHands(playerIds);

      // --- Transition to Next Phase ---
      this.state = GAME_STATE.DICE_ROLL; // State becomes DICE_ROLL
      console.log(`[Lobby ${this.lobbyId}] Decks created and hands dealt. Transitioning to ${this.state}.`);
      
      return true; // Indicate success

    } catch (error) {
      console.error(`[Lobby ${this.lobbyId}] Error during setSubject and deck creation:`, error);
      // Consider resetting state or notifying players of the error
      this.state = GAME_STATE.ERROR; // Or back to SUBJECT_SELECTION?
      // Potentially clear decks/hands if partially created
      this.playerDecks.clear();
      this.playerHands.clear();
      throw error; // Re-throw for the controller to handle
    }
  }

  // --- Helper to shuffle an array (Fisher-Yates) ---
  _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
  }
  
  // --- Helper to create and assign decks ---
  _createAndAssignDecks(playerIds, questionPool, spellEffectPool) {
    console.log(`[Lobby ${this.lobbyId}] Creating decks for players: ${playerIds.join(', ')}`);
    const [player1Id, player2Id] = playerIds;

    // Make copies of pools to avoid modifying originals if needed elsewhere
    let availableQuestions = [...questionPool];
    let availableSpellEffects = [...spellEffectPool];

    // Function to create one deck
    const createDeck = (playerId) => {
        const deck = [];
        const selectedQuestionIndices = new Set();
        const selectedSpellEffectIndices = new Set();

        // Select 10 unique questions
        while (deck.filter(c => c.type === 'question').length < 10 && availableQuestions.length > 0) {
            if (availableQuestions.length === 0) break; // Stop if pool exhausted
            const randomIndex = Math.floor(Math.random() * availableQuestions.length);
            // Ensure uniqueness if needed across players, otherwise just take from remaining pool
            deck.push(availableQuestions.splice(randomIndex, 1)[0]); 
        }

        // Select 5 unique spell/effects
        while (deck.filter(c => c.type === 'spellEffect').length < 5 && availableSpellEffects.length > 0) {
             if (availableSpellEffects.length === 0) break; // Stop if pool exhausted
            const randomIndex = Math.floor(Math.random() * availableSpellEffects.length);
             // Ensure uniqueness if needed across players, otherwise just take from remaining pool
            deck.push(availableSpellEffects.splice(randomIndex, 1)[0]);
        }

        // Check if we got enough cards
        if (deck.length < 15) { // Adjust target if fewer cards acceptable
            console.warn(`[Lobby ${this.lobbyId}] Could only create deck of ${deck.length} cards for player ${playerId} due to pool size.`);
            // Potentially throw error if 15 is strict requirement
            // return null; 
        }
        
        console.log(`[Lobby ${this.lobbyId}] Created deck for ${playerId} with ${deck.filter(c=>c.type === 'question').length}Q / ${deck.filter(c=>c.type === 'spellEffect').length}SE cards.`);
        return this._shuffleArray(deck);
    };

    const deck1 = createDeck(player1Id);
    // Replenish pools if cards should NOT be unique between players
    // availableQuestions = [...questionPool]; 
    // availableSpellEffects = [...spellEffectPool];
    const deck2 = createDeck(player2Id);

    if (!deck1 || !deck2) {
         console.error(`[Lobby ${this.lobbyId}] Failed to create one or both decks.`);
         return false;
    }

    this.playerDecks.set(player1Id, deck1);
    this.playerDecks.set(player2Id, deck2);
    console.log(`[Lobby ${this.lobbyId}] Successfully created and assigned decks.`);
    return true;
  }

  // --- Helper to deal initial hands ---
  _dealInitialHands(playerIds) {
    console.log(`[Lobby ${this.lobbyId}] Dealing initial hands...`);
    playerIds.forEach(playerId => {
      const deck = this.playerDecks.get(playerId);
      if (!deck || deck.length < 5) {
        console.error(`[Lobby ${this.lobbyId}] Cannot deal hand for ${playerId}, deck has ${deck?.length || 0} cards.`);
        // Handle error - maybe game cannot start?
        throw new Error(`Insufficient cards in deck for player ${playerId} to deal initial hand.`);
      }
      
      const hand = deck.splice(0, 5); // Take top 5 cards and modify deck
      this.playerHands.set(playerId, hand);
      this.playerDecks.set(playerId, deck); // Update the deck reference
      
      console.log(`[Lobby ${this.lobbyId}] Dealt 5 cards to ${playerId}. Hand size: 5, Deck size: ${deck.length}`);
    });
  }

  // --- Method to draw a single card ---
  drawCard(playerId) {
     console.log(`[Lobby ${this.lobbyId}] Player ${playerId} attempting to draw card.`);
     const deck = this.playerDecks.get(playerId);
     const hand = this.playerHands.get(playerId);

     if (!deck || !hand) {
         console.error(`[Lobby ${this.lobbyId}] Error drawing card: Deck or hand not found for player ${playerId}.`);
         return null; // Indicate failure
     }

     if (deck.length === 0) {
         console.log(`[Lobby ${this.lobbyId}] Player ${playerId} deck is empty. Cannot draw.`);
         // Potentially handle fatigue/damage later?
         return null; // Indicate nothing drawn
     }

     const drawnCard = deck.shift(); // Take the top card
     hand.push(drawnCard);

     this.playerDecks.set(playerId, deck); // Update deck
     this.playerHands.set(playerId, hand); // Update hand

     console.log(`[Lobby ${this.lobbyId}] Player ${playerId} drew card ${drawnCard?._id || 'N/A'}. Hand size: ${hand.length}, Deck size: ${deck.length}`);
     return drawnCard; // Return the card that was drawn
  }

  // --- Method for player to summon a question card ---
  summonQuestionCard(playerId, cardId) {
    console.log(`[Lobby ${this.lobbyId}] Player ${playerId} attempting to summon question card ${cardId}. Current state: ${this.state}, Turn: ${this.currentTurn}`);
    
    // --- Validation Checks ---
    if (this.currentTurn !== playerId) {
        throw new Error('It\'s not your turn.');
    }
    if (this.state !== GAME_STATE.AWAITING_CARD_SUMMON) {
        throw new Error(`Cannot summon card in current state: ${this.state}`);
    }
    if (this.hasSummonedQuestionThisTurn) {
        throw new Error('You have already summoned a question card this turn.');
    }

    const hand = this.playerHands.get(playerId);
    if (!hand) {
        console.error(`[Lobby ${this.lobbyId}] Error: Hand not found for player ${playerId}.`);
        throw new Error('Player hand not found.');
    }

    const cardIndex = hand.findIndex(card => card._id.toString() === cardId);
    if (cardIndex === -1) {
        throw new Error('Card not found in your hand.');
    }

    const cardToSummon = hand[cardIndex];
    if (cardToSummon.type !== 'question') {
        throw new Error('The selected card is not a Question Card.');
    }

    // --- Action --- 
    // Remove card from hand
    hand.splice(cardIndex, 1);
    this.playerHands.set(playerId, hand);

    // Set as active summoned card
    this.currentSummonedCard = cardToSummon;
    
    // Update turn flags and state
    this.hasSummonedQuestionThisTurn = true;
    this.state = GAME_STATE.AWAITING_OPPONENT_ANSWER;

    const opponentId = Array.from(this.players.keys()).find(id => id !== playerId);

    console.log(`[Lobby ${this.lobbyId}] Player ${playerId} successfully summoned card ${cardId}. State -> ${this.state}. Waiting for ${opponentId} to answer.`);
    
    // Return essential info for the controller/event emission
    return {
        success: true,
        summonedCard: {
             id: cardToSummon._id,
             text: cardToSummon.questionText, // Adjust field names as needed
             options: cardToSummon.choices // Adjust field names as needed
        },
        attackerId: playerId,
        defenderId: opponentId,
        newState: this.state
    };
  }

  // --- Method for player to play a spell/effect card ---
  playSpellEffectCard(playerId, cardId) {
    console.log(`[Lobby ${this.lobbyId}] Player ${playerId} attempting to play spell/effect card ${cardId}. Current state: ${this.state}, Turn: ${this.currentTurn}`);

    // --- Validation Checks ---
    if (this.currentTurn !== playerId) {
        throw new Error('It\'s not your turn.');
    }
    if (this.state !== GAME_STATE.AWAITING_CARD_SUMMON) {
        throw new Error(`Cannot play spell/effect card in current state: ${this.state}`);
    }
    if (this.hasPlayedSpellEffectThisTurn) {
        throw new Error('You have already played a spell/effect card this turn.');
    }

    const hand = this.playerHands.get(playerId);
    if (!hand) {
        console.error(`[Lobby ${this.lobbyId}] Error: Hand not found for player ${playerId}.`);
        throw new Error('Player hand not found.');
    }

    const cardIndex = hand.findIndex(card => card._id.toString() === cardId);
    if (cardIndex === -1) {
        throw new Error('Card not found in your hand.');
    }

    const cardToPlay = hand[cardIndex];
    if (cardToPlay.type !== 'spellEffect') {
        throw new Error('The selected card is not a Spell/Effect Card.');
    }

    // --- Action --- 
    console.log(`[Lobby ${this.lobbyId}] Playing card ${cardId} with effect:`, cardToPlay.effect);
    // Remove card from hand BEFORE applying effect (in case effect draws cards)
    hand.splice(cardIndex, 1);
    this.playerHands.set(playerId, hand);

    // Apply the effect
    const effectResult = this._applyCardEffect(playerId, cardToPlay.effect);

    // Update turn flag
    this.hasPlayedSpellEffectThisTurn = true;

    // State generally remains AWAITING_CARD_SUMMON unless effect ends game
    // Check for game over AFTER applying effect
    let gameOver = false;
    let winnerId = null;
    if (this.isGameOver()) {
        this.state = GAME_STATE.GAME_OVER;
        winnerId = this.getWinner();
        gameOver = true;
        console.log(`[Lobby ${this.lobbyId}] Game Over triggered by spell/effect card ${cardId}. Winner: ${winnerId}`);
    }

    console.log(`[Lobby ${this.lobbyId}] Player ${playerId} successfully played spell/effect card ${cardId}. Effect applied. State remains ${this.state}.`);
    
    // Return details for the controller/event emission
    return {
        success: true,
        playedCardId: cardId,
        effectApplied: effectResult, // Include details of what happened
        newState: this.state,
        gameOver: gameOver,
        winnerId: winnerId,
        // Include updated HP if needed
        playerHp: this.players.get(playerIds[0])?.hp, // Adjust player IDs if necessary
        opponentHp: this.players.get(playerIds[1])?.hp
    };
  }

  // --- Helper to Apply Card Effects --- 
  _applyCardEffect(casterId, effect) {
    // Placeholder for effect logic. Assumes effect is an object like 
    // { type: 'damage', amount: 3, target: 'opponent' } or 
    // { type: 'heal', amount: 2, target: 'self' }
    if (!effect || !effect.type) {
        console.warn(`[Lobby ${this.lobbyId}] Invalid or missing effect object for card.`);
        return { description: 'No effect applied.' };
    }

    const opponentId = Array.from(this.players.keys()).find(id => id !== casterId);
    let description = '';

    console.log(`[Lobby ${this.lobbyId}] Applying effect: ${effect.type}`);
    switch (effect.type.toLowerCase()) {
        case 'damage':
            const targetIdDmg = (effect.target === 'opponent' && opponentId) ? opponentId : casterId;
            const damageAmount = effect.amount || 0;
            if (targetIdDmg && damageAmount > 0) {
                this._applyDamage(targetIdDmg, damageAmount);
                description = `Dealt ${damageAmount} damage to ${this.players.get(targetIdDmg)?.name}.`;
            } else {
                 description = 'Damage effect misconfigured.';
            }
            break;
        case 'heal':
             const targetIdHeal = (effect.target === 'self') ? casterId : (effect.target === 'opponent' && opponentId) ? opponentId : casterId; // Default to self if unspecified
             const healAmount = effect.amount || 0;
             if (targetIdHeal && healAmount > 0) {
                 this._healPlayer(targetIdHeal, healAmount);
                 description = `Healed ${this.players.get(targetIdHeal)?.name} for ${healAmount} HP.`;
            } else {
                 description = 'Heal effect misconfigured.';
            }
            break;
        // Add more cases for other effects: draw, discard, etc.
        // case 'draw': ...
        // case 'discard': ...
        default:
            console.warn(`[Lobby ${this.lobbyId}] Unknown card effect type: ${effect.type}`);
            description = `Unknown effect: ${effect.type}.`;
            break;
    }
    console.log(`[Lobby ${this.lobbyId}] Effect applied result: ${description}`);
    return { description };
  }

  // --- Placeholder Helper Methods for Effects ---
  _applyDamage(targetPlayerId, amount) {
      const player = this.players.get(targetPlayerId);
      if (player) {
          player.hp = Math.max(0, player.hp - amount); // Ensure HP doesn't go below 0
          console.log(`[Lobby ${this.lobbyId}] Applied ${amount} damage to ${targetPlayerId}. New HP: ${player.hp}`);
      } else {
          console.warn(`[Lobby ${this.lobbyId}] Cannot apply damage, player ${targetPlayerId} not found.`);
      }
  }

  _healPlayer(targetPlayerId, amount) {
       const player = this.players.get(targetPlayerId);
       if (player) {
           // Optional: Define max HP? For now, just add
           player.hp += amount;
           console.log(`[Lobby ${this.lobbyId}] Healed ${targetPlayerId} for ${amount}. New HP: ${player.hp}`);
       } else {
           console.warn(`[Lobby ${this.lobbyId}] Cannot heal, player ${targetPlayerId} not found.`);
       }
  }

  // --- Method for defender to submit their answer ---
  submitAnswer(playerId, submittedAnswer) {
    console.log(`[Lobby ${this.lobbyId}] Player ${playerId} attempting to submit answer: ${submittedAnswer}. Current state: ${this.state}`);

    // --- Validation Checks ---
    if (this.state !== GAME_STATE.AWAITING_OPPONENT_ANSWER) {
        throw new Error(`Cannot submit answer in current state: ${this.state}`);
    }
    if (!this.currentSummonedCard) {
        console.error(`[Lobby ${this.lobbyId}] Error: submitAnswer called but no card was summoned.`);
        throw new Error('No question card is currently active.');
    }
    
    // Find opponent ID (who should be submitting the answer)
    const attackerId = this.currentTurn;
    const opponentId = Array.from(this.players.keys()).find(id => id !== attackerId);

    if (playerId !== opponentId) {
         throw new Error('Only the defending player can submit an answer.');
    }

    // --- Check Answer --- 
    const correctAnswer = this.currentSummonedCard.correctAnswer; // Adjust field name if needed
    const isCorrect = submittedAnswer === correctAnswer;
    console.log(`[Lobby ${this.lobbyId}] Answer submitted. Correct Answer: ${correctAnswer}, Submitted: ${submittedAnswer}, Correct: ${isCorrect}`);

    // --- Resolve Turn --- 
    const turnResult = this._resolveTurn(isCorrect);

    // --- Cleanup --- 
    const answeredCardId = this.currentSummonedCard._id;
    this.currentSummonedCard = null; // Clear the answered card

    console.log(`[Lobby ${this.lobbyId}] Answer processed for card ${answeredCardId}. Turn resolved.`);

    // Return the result from resolution (includes HP updates, game over check, etc.)
    return { 
        submittedAnswer: submittedAnswer,
        isCorrect: isCorrect,
        ...turnResult // Spread the results from _resolveTurn
    };
  }

  // --- Helper method to resolve the turn after an answer ---
  _resolveTurn(isCorrect) {
    const QUESTION_DAMAGE = 5; // Define base damage for incorrect answer
    const attackerId = this.currentTurn;
    const defenderId = Array.from(this.players.keys()).find(id => id !== attackerId);

    if (!attackerId || !defenderId) {
        console.error(`[Lobby ${this.lobbyId}] Error resolving turn: Cannot identify attacker or defender.`);
        throw new Error('Failed to identify players for turn resolution.');
    }

    console.log(`[Lobby ${this.lobbyId}] Resolving turn. Attacker: ${attackerId}, Defender: ${defenderId}, Answer Correct: ${isCorrect}`);

    // Apply HP changes based on rules
    if (isCorrect) {
      // Defender answered correctly -> Attacker takes damage
      console.log(`[Lobby ${this.lobbyId}] Defender answered correctly. Applying ${QUESTION_DAMAGE} damage to attacker ${attackerId}.`);
      this._applyDamage(attackerId, QUESTION_DAMAGE);
    } else {
      // Defender answered incorrectly -> Defender takes damage
      console.log(`[Lobby ${this.lobbyId}] Defender answered incorrectly. Applying ${QUESTION_DAMAGE} damage to defender ${defenderId}.`);
      this._applyDamage(defenderId, QUESTION_DAMAGE);
    }

    // Get current HP after damage applied
    const attackerHp = this.players.get(attackerId)?.hp;
    const defenderHp = this.players.get(defenderId)?.hp;

    // Check for Game Over
    if (this.isGameOver()) {
      this.state = GAME_STATE.GAME_OVER;
      const winnerId = this.getWinner();
      console.log(`[Lobby ${this.lobbyId}] Game Over! Winner: ${winnerId}. Final HP -> Attacker(${attackerId}): ${attackerHp}, Defender(${defenderId}): ${defenderHp}. State: ${this.state}`);
      return {
        gameOver: true,
        winnerId: winnerId,
        finalAttackerHp: attackerHp,
        finalDefenderHp: defenderHp,
        newState: this.state
      };
    }

    // If not game over, switch turn
    const nextPlayerId = defenderId; // The player who just answered takes the next turn
    this._switchToNextTurn(nextPlayerId); // Updates currentTurn and resets flags
    
    // Draw card for the player starting their turn
    console.log(`[Lobby ${this.lobbyId}] Drawing card for new turn player: ${this.currentTurn}`);
    this.drawCard(this.currentTurn);

    // Set state for the new turn
    this.state = GAME_STATE.AWAITING_CARD_SUMMON;
    
    console.log(`[Lobby ${this.lobbyId}] Turn resolved. Next turn: ${this.currentTurn}. State: ${this.state}. HP -> Attacker(${attackerId}): ${attackerHp}, Defender(${defenderId}): ${defenderHp}`);

    return {
      gameOver: false,
      newTurnPlayerId: this.currentTurn,
      attackerHp: attackerHp, // HP after resolution
      defenderHp: defenderHp,
      newState: this.state
    };
  }

  // Method to handle setting a player's dice roll
  setDiceRoll(playerId, rollValue) {
    console.log(`[Lobby ${this.lobbyId}] setDiceRoll called for player ${playerId} with value ${rollValue}. Current state: ${this.state}`);
    if (this.state !== GAME_STATE.DICE_ROLL) {
      console.error(`[Lobby ${this.lobbyId}] Error: Cannot roll dice outside of DICE_ROLL state.`);
      throw new Error('Cannot roll dice outside of DICE_ROLL state');
    }
    if (this.playerDiceRolls.has(playerId)) {
      console.warn(`[Lobby ${this.lobbyId}] Player ${playerId} attempted to roll again.`);
      return { stateChanged: false, result: null }; // Indicate no change, already rolled
    }

    console.log(`[Lobby ${this.lobbyId}] Storing roll ${rollValue} for player ${playerId}.`);
    this.playerDiceRolls.set(playerId, rollValue);
    console.log(`[Lobby ${this.lobbyId}] Rolls stored:`, this.playerDiceRolls);

    // Check if both players have rolled
    console.log(`[Lobby ${this.lobbyId}] Checking if both players rolled. Stored rolls: ${this.playerDiceRolls.size}, Expected players: ${this.players.size}`);
    if (this.playerDiceRolls.size === this.players.size && this.players.size === 2) {
        console.log(`[Lobby ${this.lobbyId}] Both players have rolled. Determining winner...`);
        const playerIds = Array.from(this.players.keys());
        const player1Id = playerIds[0];
        const player2Id = playerIds[1];
        const roll1 = this.playerDiceRolls.get(player1Id);
        const roll2 = this.playerDiceRolls.get(player2Id);
        let winnerId = null;
        let nextTurnPlayerId = null; // Explicitly track who goes first
        let isTie = false;
        
        if (roll1 === roll2) {
            console.log(`Dice roll tie (${roll1} vs ${roll2}) in lobby ${this.lobbyId}. Resetting for re-roll.`);
            winnerId = null; // Tie
            this.state = GAME_STATE.DICE_ROLL; // Stay in dice roll state
            this.playerDiceRolls.clear(); // Clear rolls for the re-roll
            isTie = true;
        } else if (roll1 > roll2) {
            winnerId = player1Id;
            nextTurnPlayerId = player1Id; // Winner takes the first turn
            this.state = GAME_STATE.AWAITING_CARD_SUMMON; // Move to gameplay
            this.currentTurn = nextTurnPlayerId;
            this.playerDiceRolls.clear(); // Clear rolls after determining winner
            console.log(`Player ${player1Id} wins roll (${roll1} vs ${roll2}). Next state: ${this.state}, Turn: ${this.currentTurn}`);
        } else { // roll2 > roll1
            winnerId = player2Id;
            nextTurnPlayerId = player2Id; // Winner takes the first turn
            this.state = GAME_STATE.AWAITING_CARD_SUMMON; // Move to gameplay
            this.currentTurn = nextTurnPlayerId;
            this.playerDiceRolls.clear(); // Clear rolls after determining winner
            console.log(`Player ${player2Id} wins roll (${roll2} vs ${roll1}). Next state: ${this.state}, Turn: ${this.currentTurn}`);
        }
        
        // If not a tie, draw the first card for the player starting the game
        if (!isTie && nextTurnPlayerId) {
             console.log(`[Lobby ${this.lobbyId}] Drawing initial card for first turn player: ${nextTurnPlayerId}`);
             this.drawCard(nextTurnPlayerId);
             // Also reset turn flags for the start of the first turn
             this._resetTurnFlags(); 
        }

        const resultPayload = {
             player1Id: player1Id, 
             player2Id: player2Id,
             player1Roll: roll1, 
             player2Roll: roll2, 
             winnerId: winnerId, 
             nextTurn: nextTurnPlayerId, // Who takes the actual first turn (null on tie)
             newState: this.state // Send the updated state
        };
        console.log(`[Lobby ${this.lobbyId}] Determined dice result:`, resultPayload);
        return { stateChanged: true, result: resultPayload }; // Indicate state changed, include result
    } else {
        console.log(`[Lobby ${this.lobbyId}] Only ${this.playerDiceRolls.size} player(s) rolled. Waiting...`);
        return { stateChanged: false, result: null }; // Indicate no change yet
    }
  }

  isGameOver() {
    return Array.from(this.players.values()).some(player => player.hp <= 0);
  }

  getWinner() {
    const players = Array.from(this.players.values());
    const winner = players.find(player => player.hp > 0);
    const loser = players.find(player => player.hp <= 0);
    console.log(`[Lobby ${this.lobbyId}] Checking winner: Winner HP: ${winner?.hp}, Loser HP: ${loser?.hp}`);
    return winner?.id;
  }
}

// Update the createGame function to use the new class name
exports.createGame = async (lobbyId) => {
  try {
    const game = new PvpGameInstance(lobbyId); // Use renamed class
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
    console.log('Attempting to join game:', { lobbyId, playerId, playerName });
    
    let game = activeGames.get(lobbyId);
    if (!game) {
      console.log('Game not found, creating new game:', lobbyId);
      game = await exports.createGame(lobbyId);
    }

    const added = game.addPlayer(playerId, playerName);
    console.log('Player join result:', { 
      lobbyId, 
      playerId, 
      added,
      totalPlayers: game.players.size 
    });
    
    if (game.players.size === 2) {
      game.state = GAME_STATE.RPS;
      console.log('Game ready for RPS:', { 
        lobbyId,
        players: game.getPlayers(),
        state: game.state
      });
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
      // Call determineRpsWinner only ONCE and store the result
      const rpsOutcome = game.determineRpsWinner(); 
      const { winner, isDraw, choices } = rpsOutcome;

      const io = socketService.getIo();
      
      // Emit the result using the stored outcome
      console.log(`Emitting rps_result for lobby ${lobbyId}:`, rpsOutcome);
      io.to(lobbyId).emit('rps_result', rpsOutcome);
      
      // If it was a draw, clear choices and wait for next round
      if (isDraw) {
          console.log(`RPS Draw in lobby ${lobbyId}. Resetting choices.`);
          // determineRpsWinner already cleared choices on draw in this implementation
          // game.clearRpsChoices(); // No need to call again if handled inside determineRpsWinner
          return { winner: null, isDraw: true }; // Indicate draw
      }
      
      // If there IS a winner (and not a draw)
      if (winner) {
          console.log(`RPS winner determined: ${winner}. State should now be SUBJECT_SELECTION.`);
          // State and turn were set correctly by the single call to determineRpsWinner

          // Emit the game update to synchronize clients with the state set by determineRpsWinner
          io.to(lobbyId).emit('game_update', {
             gameState: game.state, // Should be SUBJECT_SELECTION
             currentTurn: game.currentTurn, // ID of player whose turn it is (winner)
             gameMessage: `RPS complete. ${game.players.get(winner)?.name} selects the subject.`
          });
          console.log(`Emitted game_update for state ${game.state} to lobby ${lobbyId}`);
          return { winner: winner, isDraw: false }; // Indicate winner
      } 

      // Fallback case (shouldn't happen)
      console.warn(`RPS completed in lobby ${lobbyId}, but no winner determined and not a draw? Outcome:`, rpsOutcome);
    return null;

    } else {
        // Only one choice made
        console.log(`Player ${playerId} made RPS choice in lobby ${lobbyId}. Waiting for opponent.`);
        const opponentId = Array.from(game.players.keys()).find(id => id !== playerId);
        const opponentSocketId = socketService.findSocketIdByUserId(opponentId);
        if (opponentSocketId) {
            const io = socketService.getIo();
            // Emit opponent_rps_choice to the opponent
             io.to(opponentSocketId).emit('opponent_rps_choice', { 
                 playerId: playerId // Let opponent know who made the choice
                 // choice: choice // Optionally send the actual choice if needed by opponent UI
             });
             console.log(`Emitted opponent_rps_choice to socket ${opponentSocketId}`);
        }
        return null; // Indicate not all choices are in yet
    }

  } catch (error) {
    console.error('Error handling RPS choice:', error);
    throw error;
  }
};

// Update handleSubjectSelection to store fetched questions
exports.handleSubjectSelection = async (lobbyId, playerId, subject) => { // Added playerId
  try {
    const game = activeGames.get(lobbyId);
    if (!game) throw new Error('Game not found');
    if (!game.canSelectSubject(playerId)) throw new Error('Not player\'s turn or wrong state for subject selection');

    game.setSubject(playerId, subject); // Updates state to CARD_SELECTION

    // Fetch questions for the selected subject
    console.log(`Fetching questions for subject ${subject.id} in lobby ${lobbyId}`);
    const questions = await Question.find({ subject: subject.id })
      .select('_id questionText choices correctAnswer difficulty') // Fetch needed fields
      .limit(30); // Fetch enough for both players initially

    if (!questions || questions.length < 30) { // Need enough for both players
        console.error(`Insufficient questions found for subject ${subject.id}: Found ${questions?.length || 0}`);
        throw new Error(`Not enough questions available for subject: ${subject.name}`);
    }
    
    game.storeFetchedQuestions(questions); // Store questions on the game instance
    
    console.log(`Subject selection complete, ${questions.length} questions stored for lobby ${lobbyId}. State: ${game.state}`);
    // Inform clients that subject is selected and state is CARD_SELECTION
    const io = socketService.getIo();
    io.to(lobbyId).emit('game_update', {
        gameState: game.state, // Should be CARD_SELECTION
        selectedSubject: game.selectedSubject,
        // Send available questions to BOTH clients for selection
        availableQuestions: game.questions.map(q => ({ id: q._id, text: q.questionText })) // Send only id/text
    });

    return game; // Return game instance

  } catch (error) {
    console.error('Error handling subject selection in controller:', error);
    // Emit error back to the specific player?
    throw error; // Re-throw
  }
};

// NEW function to handle question selection confirmation
exports.handleQuestionSelection = async (lobbyId, playerId, selectedQuestionIds) => {
    try {
        const game = activeGames.get(lobbyId);
        if (!game) throw new Error('Game not found');
        if (game.state !== GAME_STATE.CARD_SELECTION) throw new Error('Not in card selection phase');

        // Assign cards and check if both players are done
        const readyToDeal = game.assignCards(playerId, selectedQuestionIds);

        if (readyToDeal) {
            const io = socketService.getIo();
            const playerIds = Array.from(game.players.keys());

            // Emit dealt hand to each player individually
            for (const pId of playerIds) {
                const playerHand = game.playerHands.get(pId);
                const targetSocketId = socketService.findSocketIdByUserId(pId);
                if (targetSocketId && playerHand) {
                    io.to(targetSocketId).emit('deal_cards', { 
                        // Send full question objects for the hand
                        playerHand: playerHand.map(q => ({ 
                            id: q._id.toString(), 
                            text: q.questionText, 
                            options: q.choices, 
                            correctAnswer: q.correctAnswer, // Client needs this eventually?
                            difficulty: q.difficulty
                        })) 
                    });
                    console.log(`Emitted deal_cards to player ${pId}`);
                } else {
                    console.error(`Could not find socket or hand for player ${pId} to emit deal_cards`);
                }
            }

            // Emit game update to lobby to change state to DICE_ROLL
            io.to(lobbyId).emit('game_update', {
                gameState: game.state, // Should be DICE_ROLL
                playerHandCount: game.playerHands.get(playerIds[0])?.length || 0, // Example count
                opponentHandCount: game.playerHands.get(playerIds[1])?.length || 0 // Example count
            });
            console.log(`Emitted game_update for state ${game.state} to lobby ${lobbyId}`);
        } else {
            // Optionally notify the lobby that one player is waiting
            const io = socketService.getIo();
            io.to(lobbyId).emit('game_message', { message: `Player ${game.players.get(playerId)?.name} confirmed selection. Waiting for opponent...` });
        }
        
        return game; // Return updated game instance

    } catch (error) {
        console.error('Error handling question selection:', error);
        // Emit error back?
    throw error;
  }
};

// Handle answer submission
exports.handleAnswerSubmission = async (lobbyId, playerId, questionId, answerChosen, timedOut) => {
  try {
    const game = activeGames.get(lobbyId);
    if (!game) {
      throw new Error('Game not found');
    }

    // Check if it's the player's turn to answer?
    // Need game logic to determine who is being asked
    // For now, assume playerId is the one who should be answering

    const question = game.questions.find(q => q._id.toString() === questionId);
    if (!question) {
        throw new Error('Question not found in current game state');
    }

    let isCorrect = false;
    let message = '';
    const DAMAGE_ON_WRONG = 10; // Define damage amount
    let damageDealt = 0;

    if (timedOut) {
        isCorrect = false;
        message = "Time's up!";
        damageDealt = DAMAGE_ON_WRONG;
    } else {
        isCorrect = answerChosen === question.correctAnswer;
        message = isCorrect ? "Correct!" : "Wrong!";
        if (!isCorrect) {
            damageDealt = DAMAGE_ON_WRONG;
        }
    }
    
    console.log('Processing answer:', { lobbyId, playerId, questionId, answerChosen, timedOut, isCorrect, damageDealt });

    // Apply damage to the player who answered
    const player = game.players.get(playerId);
    if (player) {
        player.hp = Math.max(0, player.hp - damageDealt);
        console.log(`Player ${playerId} HP updated to: ${player.hp}`);
    }
    
    // Determine next turn (opponent of the current answerer)
    const playerIds = Array.from(game.players.keys());
    const nextTurnPlayerId = playerIds.find(id => id !== playerId);
    game.currentTurn = nextTurnPlayerId;
    game.state = nextTurnPlayerId ? GAME_STATE.PLAYER_SELECT_CARD : GAME_STATE.WAITING; // Or determine based on whose turn

    console.log('Game state after answer:', { lobbyId, state: game.state, currentTurn: game.currentTurn });

    // Prepare payload for frontend
    const player1 = game.players.get(playerIds[0]);
    const player2 = game.players.get(playerIds[1]);
    const resultPayload = {
        isCorrect: isCorrect,
        message: message,
        playerHp: player1 ? player1.hp : 0, // Ensure players exist
        opponentHp: player2 ? player2.hp : 0, // Adjust based on actual player IDs
        nextTurn: game.currentTurn, 
    };

    // *** Emit 'answer_result' instead of 'opponent_answer_submitted' ***
    const io = socketService.getIo(); // Get socket.io instance
    io.to(lobbyId).emit('answer_result', resultPayload);
    console.log('Emitted answer_result:', resultPayload);

    // Check for game over AFTER emitting the result
    if (game.isGameOver()) {
        game.state = GAME_STATE.GAME_OVER; // Correct state
        const winnerId = game.getWinner();
        const loserId = playerIds.find(id => id !== winnerId);

        const gameOverPayload = {
            winnerId: winnerId,
            reason: `${loserId ? game.players.get(loserId)?.name : 'Opponent'} ran out of HP!`, 
            finalPlayerHp: player1 ? player1.hp : 0,
            finalOpponentHp: player2 ? player2.hp : 0,
            // Add message if needed
        };
        
        console.log('Game Over detected, emitting game_over:', gameOverPayload);
        io.to(lobbyId).emit('game_over', gameOverPayload); 
        
        // Clean up the game instance from memory
        activeGames.delete(lobbyId);
        console.log('Game instance removed from memory:', lobbyId);
        
        // Return something indicate game over if needed by server.js, though not strictly necessary now
        return { isCorrect, gameOver: true, winner: winnerId }; 
    }

    // Return basic result if game is not over
    return { isCorrect, gameOver: false };

  } catch (error) {
    console.error('Error handling answer submission in controller:', error);
    // Optionally emit an error back to the specific socket that submitted
    const io = socketService.getIo();
    if (io) {
        const socket = io.sockets.sockets.get(socketService.findSocketIdByUserId(playerId)); // Find socket if possible
        if (socket) socket.emit('error', { message: error.message || 'Failed to process answer submission' });
    }
    throw error; // Re-throw for server.js to catch if needed
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

// Get game by lobby ID
exports.getGame = (lobbyId) => {
  try {
    const game = activeGames.get(lobbyId);
    if (!game) {
      throw new Error('Game not found');
    }
    return game;
  } catch (error) {
    console.error('Error getting game:', error);
    throw error;
  }
};

// NEW function to handle a player rolling the dice
exports.handleDiceRoll = async (lobbyId, playerId) => {
    console.log(`[Controller] handleDiceRoll called for lobby ${lobbyId}, player ${playerId}`);
    try {
        const game = activeGames.get(lobbyId);
        if (!game) { 
            console.error(`[Controller] Game not found for lobby ${lobbyId} in handleDiceRoll`);
            throw new Error('Game not found');
        }
        if (game.state !== GAME_STATE.DICE_ROLL) { 
            console.error(`[Controller] Incorrect state (${game.state}) for dice roll in lobby ${lobbyId}`);
            throw new Error('Not in dice roll phase');
        }

        // Generate dice roll value (1-6)
        const rollValue = Math.floor(Math.random() * 6) + 1;
        console.log(`[Controller] Generated roll value ${rollValue} for player ${playerId} in lobby ${lobbyId}`);

        // Set the roll in the game instance and get the structured result
        console.log(`[Controller] Calling game.setDiceRoll for player ${playerId} in lobby ${lobbyId}`);
        const { stateChanged, result: diceResult } = game.setDiceRoll(playerId, rollValue);
        console.log(`[Controller] Result from game.setDiceRoll for lobby ${lobbyId}:`, { stateChanged, diceResult });

        const io = socketService.getIo();
        if (!io) {
            console.error("[Controller] Failed to get io instance from socketService in handleDiceRoll");
            throw new Error("Socket service not available");
        }

        if (stateChanged && diceResult) {
            // Both players have rolled, emit the final result
            console.log(`[Controller] Both players rolled. Emitting dice_result to lobby ${lobbyId}`);
            io.to(lobbyId).emit('dice_result', {
                player1Id: diceResult.player1Id,
                player2Id: diceResult.player2Id,
                player1Roll: diceResult.player1Roll,
                player2Roll: diceResult.player2Roll,
                winnerId: diceResult.winnerId, // null if tie
                nextTurn: diceResult.nextTurn, // null if tie
                state: diceResult.newState 
            });

            // If it was a tie, message and return
            if (!diceResult.winnerId) {
                console.log(`[Controller] Dice roll tie in lobby ${lobbyId}. Emitting message.`);
                io.to(lobbyId).emit('game_message', { 
                     message: `Dice Roll Tie! Roll again.` 
                 });
            } else {
                // If there's a winner, emit game_update to start the gameplay phase
                console.log(`[Controller] Dice winner determined. Emitting game_update for state ${diceResult.newState} to lobby ${lobbyId}`);
                const player1 = game.players.get(diceResult.player1Id);
                const player2 = game.players.get(diceResult.player2Id);
                io.to(lobbyId).emit('game_update', {
                    gameState: diceResult.newState, // Should be AWAITING_CARD_SUMMON
                    currentTurn: diceResult.nextTurn, // ID of the winner
                    player1Hp: player1?.hp,
                    player2Hp: player2?.hp,
                    player1HandCount: game.playerHands.get(diceResult.player1Id)?.length || 0,
                    player2HandCount: game.playerHands.get(diceResult.player2Id)?.length || 0,
                    gameMessage: `Dice roll complete. ${game.players.get(diceResult.winnerId)?.name} goes first!`
                });
            }

        } else if (!stateChanged) {
            // Only one player rolled (or player tried to roll again)
            console.log(`[Controller] Only one player rolled or player re-rolled in lobby ${lobbyId}. Emitting opponent_dice_roll.`);
            
            // Notify lobby that one player is waiting
            io.to(lobbyId).emit('game_message', { 
                 message: `Player ${game.players.get(playerId)?.name} rolled ${rollValue}. Waiting for opponent...` 
             });
            
            // Notify the opponent specifically about the roll
            const opponentId = Array.from(game.players.keys()).find(id => id !== playerId);
            const opponentSocketId = socketService.findSocketIdByUserId(opponentId);
            console.log(`[Controller] Found opponent socket for opponent_dice_roll emit: ${opponentSocketId}`);
            if (opponentSocketId) {
                io.to(opponentSocketId).emit('opponent_dice_roll', { 
                    playerId: playerId, 
                    value: rollValue 
                }); 
                 console.log(`[Controller] Emitted opponent_dice_roll to ${opponentSocketId}`);
            }
        } else {
            // Should not happen if stateChanged is true but result is null
             console.warn(`[Controller] Unexpected result from setDiceRoll in lobby ${lobbyId}: stateChanged=true but result is null.`);
        }
        
        return game; // Return the game instance

    } catch (error) {
        console.error(`[Controller] Error handling dice roll for player ${playerId} in lobby ${lobbyId}:`, error);
        // Emit error back to the specific player?
        const errorSocketId = socketService.findSocketIdByUserId(playerId);
        if (errorSocketId) {
            const io = socketService.getIo();
            if (io) io.to(errorSocketId).emit('game_error', { message: error.message || 'Failed to process dice roll' });
        }
        throw error;
    }
};

// --- NEW Controller for Summoning a Question Card ---
exports.handleSummonCard = async (lobbyId, playerId, cardId) => {
    console.log(`[Controller] handleSummonCard called: lobby ${lobbyId}, player ${playerId}, card ${cardId}`);
    try {
        const game = activeGames.get(lobbyId);
        if (!game) throw new Error('Game not found');

        // Call the game instance method
        const result = game.summonQuestionCard(playerId, cardId);

        if (result && result.success) {
            const io = socketService.getIo();
            if (!io) throw new Error("Socket service not available");

            const attackerId = result.attackerId;
            const defenderId = result.defenderId;
            const attackerSocketId = socketService.findSocketIdByUserId(attackerId);
            const defenderSocketId = socketService.findSocketIdByUserId(defenderId);

            console.log(`[Controller] Summon successful. Attacker: ${attackerId}(${attackerSocketId}), Defender: ${defenderId}(${defenderSocketId}).`);

            // 1. Update attacker's hand (send privately)
            if (attackerSocketId) {
                io.to(attackerSocketId).emit('game_update', {
                    playerHand: game.playerHands.get(attackerId), // Send updated hand
                    playerHandCount: game.playerHands.get(attackerId)?.length || 0
                    // Include other relevant state if needed
                });
                console.log(`[Controller] Emitted private hand update to attacker ${attackerId}`);
            }

            // 2. Present question to defender (send privately)
            if (defenderSocketId) {
                io.to(defenderSocketId).emit('question_presented', {
                    question: result.summonedCard, // Contains { id, text, options }
                    attackerName: game.players.get(attackerId)?.name || 'Opponent'
                });
                 console.log(`[Controller] Emitted question_presented to defender ${defenderId}`);
            }

            // 3. Update lobby state (broadcast)
            io.to(lobbyId).emit('game_update', {
                gameState: result.newState, // AWAITING_OPPONENT_ANSWER
                currentTurn: game.currentTurn, // Turn stays with attacker for now
                lastCardSummoned: { // Info for field display
                     cardId: result.summonedCard.id,
                     playerId: attackerId 
                },
                gameMessage: `${game.players.get(attackerId)?.name} summoned a question! Waiting for ${game.players.get(defenderId)?.name} to answer.`
            });
            console.log(`[Controller] Emitted game_update for state ${result.newState} to lobby ${lobbyId}`);

        } else {
            // Should not happen if summonQuestionCard throws errors correctly
            console.warn(`[Controller] summonQuestionCard for lobby ${lobbyId} did not return a successful result object.`);
        }
        
        return game; // Return game instance

    } catch (error) {
        console.error(`[Controller] Error handling summon card for player ${playerId} in lobby ${lobbyId}:`, error);
        // Emit error back to the specific player
        const errorSocketId = socketService.findSocketIdByUserId(playerId);
        if (errorSocketId) {
            const io = socketService.getIo();
            if (io) io.to(errorSocketId).emit('game_error', { message: error.message || 'Failed to summon card' });
        }
        throw error;
    }
};

// --- NEW Controller for Playing a Spell/Effect Card ---
exports.handlePlaySpellEffect = async (lobbyId, playerId, cardId) => {
    console.log(`[Controller] handlePlaySpellEffect called: lobby ${lobbyId}, player ${playerId}, card ${cardId}`);
    try {
        const game = activeGames.get(lobbyId);
        if (!game) throw new Error('Game not found');

        // Call the game instance method
        const result = game.playSpellEffectCard(playerId, cardId);

        if (result && result.success) {
            const io = socketService.getIo();
            if (!io) throw new Error("Socket service not available");
            
            const playerIds = Array.from(game.players.keys());
            const player1Id = playerIds[0]; // Assuming consistent player order
            const player2Id = playerIds[1];
            const player1 = game.players.get(player1Id);
            const player2 = game.players.get(player2Id);

            // Emit game update to the lobby
            io.to(lobbyId).emit('game_update', {
                gameState: result.newState, // Usually AWAITING_CARD_SUMMON unless game over
                currentTurn: game.currentTurn,
                player1Hp: result.playerHp, // Updated HP from result
                player2Hp: result.opponentHp,
                player1HandCount: game.playerHands.get(player1Id)?.length || 0,
                player2HandCount: game.playerHands.get(player2Id)?.length || 0,
                lastCardPlayed: { // Info for field display/log
                    cardId: result.playedCardId,
                    playerId: playerId,
                    type: 'spellEffect'
                },
                gameMessage: `${player1.name} played a spell/effect! ${result.effectApplied?.description || 'Effect resolved.'}`
            });
             console.log(`[Controller] Emitted game_update after spell/effect card. State: ${result.newState}`);

            // Check if the effect ended the game
            if (result.gameOver) {
                console.log(`[Controller] Game Over detected after spell/effect in lobby ${lobbyId}. Winner: ${result.winnerId}`);
                const winner = game.players.get(result.winnerId);
                const loserId = playerIds.find(id => id !== result.winnerId);
                const loser = game.players.get(loserId);

                const gameOverPayload = {
                    winnerId: result.winnerId,
                    winnerName: winner?.name || 'Winner',
                    reason: `${winner?.name || 'Winner'} won via card effect!`, 
                    finalPlayer1Hp: result.playerHp,
                    finalPlayer2Hp: result.opponentHp
                };
                
                io.to(lobbyId).emit('game_over', gameOverPayload); 
                console.log('[Controller] Emitted game_over event.');
        
                // Clean up the game instance from memory
                activeGames.delete(lobbyId);
                console.log('Game instance removed from memory:', lobbyId);
            }
        } else {
            // Should not happen if playSpellEffectCard throws errors correctly
            console.warn(`[Controller] playSpellEffectCard for lobby ${lobbyId} did not return a successful result object.`);
        }
        
        // Return game instance only if not game over?
        return game.state !== GAME_STATE.GAME_OVER ? game : null; 

    } catch (error) {
        console.error(`[Controller] Error handling play spell/effect for player ${playerId} in lobby ${lobbyId}:`, error);
        // Emit error back to the specific player
        const errorSocketId = socketService.findSocketIdByUserId(playerId);
        if (errorSocketId) {
            const io = socketService.getIo();
            if (io) io.to(errorSocketId).emit('game_error', { message: error.message || 'Failed to play spell/effect card' });
        }
        throw error;
    }
};

// --- NEW Controller for Submitting an Answer ---
exports.handleSubmitAnswer = async (lobbyId, playerId, answer) => {
    console.log(`[Controller] handleSubmitAnswer called: lobby ${lobbyId}, player ${playerId}`);
    try {
        const game = activeGames.get(lobbyId);
        if (!game) throw new Error('Game not found');

        // Call the game instance method
        // Assumes 'answer' is the value submitted by the player
        const result = game.submitAnswer(playerId, answer);

        const io = socketService.getIo();
        if (!io) throw new Error("Socket service not available");
        
        const playerIds = Array.from(game.players.keys());
        const player1Id = playerIds[0];
        const player2Id = playerIds[1];
        const player1 = game.players.get(player1Id);
        const player2 = game.players.get(player2Id);

        // 1. Emit the immediate result of the answer
        io.to(lobbyId).emit('answer_result', {
            isCorrect: result.isCorrect,
            submittedAnswer: result.submittedAnswer,
            // Use HP values returned from _resolveTurn, as they are post-damage
            player1Hp: result.gameOver ? result.finalAttackerHp : result.attackerHp, 
            player2Hp: result.gameOver ? result.finalDefenderHp : result.defenderHp,
            message: result.isCorrect ? 'Correct Answer!' : 'Incorrect Answer!'
        });
        console.log(`[Controller] Emitted answer_result to lobby ${lobbyId}`);

        // 2. Handle Game Over or Next Turn
        if (result.gameOver) {
            console.log(`[Controller] Game Over detected after answer in lobby ${lobbyId}. Winner: ${result.winnerId}`);
            const winner = game.players.get(result.winnerId);
            const loserId = playerIds.find(id => id !== result.winnerId);
            const loser = game.players.get(loserId);

            const gameOverPayload = {
                winnerId: result.winnerId,
                winnerName: winner?.name || 'Winner',
                reason: `${loser?.name || 'Opponent'} ran out of HP!`, 
                finalPlayer1Hp: result.finalAttackerHp, 
                finalPlayer2Hp: result.finalDefenderHp,
            };
            
            io.to(lobbyId).emit('game_over', gameOverPayload); 
            console.log('[Controller] Emitted game_over event.');
    
            // Clean up the game instance from memory
            activeGames.delete(lobbyId);
            console.log('Game instance removed from memory:', lobbyId);

        } else {
            // If game continues, emit update for the new turn
            console.log(`[Controller] Answer resolved, game continues. Emitting game_update for new turn. New state: ${result.newState}, Next turn: ${result.newTurnPlayerId}`);
            io.to(lobbyId).emit('game_update', {
                gameState: result.newState, // AWAITING_CARD_SUMMON
                currentTurn: result.newTurnPlayerId,
                player1Hp: result.attackerHp, // HP after resolution
                player2Hp: result.defenderHp,
                player1HandCount: game.playerHands.get(player1Id)?.length || 0, // Hand counts updated after draw
                player2HandCount: game.playerHands.get(player2Id)?.length || 0,
                gameMessage: `Turn resolved. It\'s ${game.players.get(result.newTurnPlayerId)?.name}\'s turn!`
            });
        }
        
        return game.state !== GAME_STATE.GAME_OVER ? game : null; 

    } catch (error) {
        console.error(`[Controller] Error handling submit answer for player ${playerId} in lobby ${lobbyId}:`, error);
        // Emit error back to the specific player
        const errorSocketId = socketService.findSocketIdByUserId(playerId);
        if (errorSocketId) {
            const io = socketService.getIo();
            if (io) io.to(errorSocketId).emit('game_error', { message: error.message || 'Failed to submit answer' });
        }
    throw error;
  }
}; 