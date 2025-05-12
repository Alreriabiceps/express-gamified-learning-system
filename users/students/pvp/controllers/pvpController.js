const socketService = require('../../../../services/socketService');
// const Game = require('../../../../models/Game'); // Remove this incorrect import
const RequiredGameStates = require('../constants/gameStates'); // Rename require temporarily
const Question = require('../../../admin/question/models/questionModels');

// Store active games in memory
const activeGames = new Map();

// Rename the local class to avoid conflict with the imported Game model
class PvpGameInstance {
  constructor(lobbyId, gameStateConstants) { // Accept game states as argument
    this.lobbyId = lobbyId;
    this.players = new Map(); // Stores player objects { id, name, hp, joinedAt, deck, hand }
    this.GAME_STATE = gameStateConstants; // Store game states on instance
    this.state = this.GAME_STATE.WAITING; // Use instance property
    this.currentTurn = null; // ID of the player whose turn it is
    this.selectedSubject = null;
    // Rework card/question storage:
    // this.questions = []; // Remove this - questions will be in decks/hands
    this.playerDecks = new Map(); // Map playerId -> array of card objects (full deck)
    this.playerHands = new Map(); // Map playerId -> array of card objects (current hand)
    this.currentSummonedCard = null; // Track the question card played this turn
    this.rpsChoices = new Map();
    this.playerDiceRolls = new Map();
    this.selectedQuestionsByPlayer = new Map(); // Store selected questions per player
    this.questions = []; // Store the pool of questions for the subject

    // Turn tracking flags
    this.hasSummonedQuestionThisTurn = false;
    this.hasPlayedSpellEffectThisTurn = false;

    this.createdAt = Date.now();
    console.log('New game instance created:', { lobbyId, createdAt: this.createdAt, initialState: this.state });
  }

  addPlayer(playerId, playerName) {
    console.log('Adding player to game:', { lobbyId: this.lobbyId, playerId, playerName, existingPlayers: this.players.size });

    if (this.players.has(playerId)) {
      console.log('Player already in game:', { playerId, playerName });
      return false;
    }

    if (this.players.size >= 2) {
      console.log('Game is full:', { lobbyId: this.lobbyId, players: Array.from(this.players.keys()) });
      throw new Error('Game is full');
    }

    // Initialize player data structure with new HP value
    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      hp: 100, // Increased starting HP to 100
      maxHp: 100, // Added maxHp to track healing limit
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
    this.state = this.GAME_STATE.SUBJECT_SELECTION; // Use instance property

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
    return this.state === this.GAME_STATE.SUBJECT_SELECTION && this.currentTurn === playerId; // Use instance property
  }

  // REVISED: setSubject now only stores the subject and transitions state to DECK_CREATION
  async setSubject(playerId, subject) {
    if (!this.canSelectSubject(playerId)) {
      throw new Error('Not allowed to select subject at this time');
    }
    console.log(`[Lobby ${this.lobbyId}] Player ${playerId} selected subject: ${subject.name} (ID: ${subject.id || subject._id})`);
    this.selectedSubject = subject;

    this.state = this.GAME_STATE.DECK_CREATION; // Use instance property - Use DECK_CREATION state
    if (this.state === undefined) {
      console.error(`[Lobby ${this.lobbyId}] CRITICAL ERROR: this.GAME_STATE.DECK_CREATION resolved to undefined!`);
      throw new Error('Internal server error: Game state constant missing on instance.');
    }
    console.log(`[Lobby ${this.lobbyId}] Subject set. Transitioning state to ${this.state}.`);
    return true;
  }

  // Store fetched questions (called by controller)
  storeFetchedQuestions(questions) {
    this.questions = questions; // Store the raw questions fetched by the controller
    console.log(`[Lobby ${this.lobbyId}] Stored ${questions.length} questions fetched by controller.`);
  }

  // Assign selected cards to player decks (called by controller during DECK_CREATION)
  assignCards(playerId, selectedQuestionIds) {
    if (!this.selectedQuestionsByPlayer) {
      console.error(`[Lobby ${this.lobbyId}] Error: selectedQuestionsByPlayer map not initialized!`);
      this.selectedQuestionsByPlayer = new Map(); // Initialize if missing
    }

    // Validate input selection size immediately
    const DECK_SIZE_REQUIRED = 15;
    if (!Array.isArray(selectedQuestionIds) || selectedQuestionIds.length !== DECK_SIZE_REQUIRED) {
      console.warn(`[Lobby ${this.lobbyId}] Player ${playerId} submitted invalid selection count: ${selectedQuestionIds?.length}. Required: ${DECK_SIZE_REQUIRED}`);
      return false; // Indicate failure
    }

    // Ensure IDs are unique within the player's own selection
    const uniqueIds = Array.from(new Set(selectedQuestionIds));
    if (uniqueIds.length !== DECK_SIZE_REQUIRED) {
      console.warn(`[Lobby ${this.lobbyId}] Player ${playerId} submitted selection with duplicate IDs.`);
      return false; // Indicate failure
    }

    if (!this.selectedQuestionsByPlayer.has(playerId)) {
      this.selectedQuestionsByPlayer.set(playerId, uniqueIds);
      console.log(`[Lobby ${this.lobbyId}] Player ${playerId} confirmed selection of ${uniqueIds.length} unique questions.`);
    } else {
      console.warn(`[Lobby ${this.lobbyId}] Player ${playerId} tried to confirm selection again.`);
      return false;
    }

    // Check if both players have selected
    if (this.selectedQuestionsByPlayer.size === 2) {
      console.log(`[Lobby ${this.lobbyId}] Both players have selected questions. Creating decks...`);
      const playerIds = Array.from(this.players.keys());
      const [player1Id, player2Id] = playerIds;

      const player1SelectedIds = this.selectedQuestionsByPlayer.get(player1Id);
      const player2SelectedIds = this.selectedQuestionsByPlayer.get(player2Id);

      // Retrieve full question objects for each player based on their individual selections
      const deck1Pool = this.questions.filter(q => player1SelectedIds.includes(q._id.toString()));
      const deck2Pool = this.questions.filter(q => player2SelectedIds.includes(q._id.toString()));

      // Ensure uniqueness in the deck pool by questionText (aggressive filtering)
      function filterUniqueByText(deckPool) {
        const seen = new Set();
        return deckPool.filter(q => {
          const textKey = q.questionText?.trim().toLowerCase();
          if (!textKey || seen.has(textKey)) return false;
          seen.add(textKey);
          return true;
        });
      }
      const uniqueDeck1 = filterUniqueByText(deck1Pool);
      const uniqueDeck2 = filterUniqueByText(deck2Pool);
      console.log(`[Lobby ${this.lobbyId}] Unique deck1 question texts:`, uniqueDeck1.map(q => q.questionText));
      console.log(`[Lobby ${this.lobbyId}] Unique deck2 question texts:`, uniqueDeck2.map(q => q.questionText));

      // Validate final pool sizes (should match required deck size)
      if (uniqueDeck1.length !== DECK_SIZE_REQUIRED) {
        console.error(`[Lobby ${this.lobbyId}] Error creating deck for Player 1: Found ${uniqueDeck1.length} unique questions (by text), expected ${DECK_SIZE_REQUIRED}.`);
        return false;
      }
      if (uniqueDeck2.length !== DECK_SIZE_REQUIRED) {
        console.error(`[Lobby ${this.lobbyId}] Error creating deck for Player 2: Found ${uniqueDeck2.length} unique questions (by text), expected ${DECK_SIZE_REQUIRED}.`);
        return false;
      }

      // Shuffle each player's selected pool to create their deck
      const deck1 = this._shuffleArray([...uniqueDeck1]);
      const deck2 = this._shuffleArray([...uniqueDeck2]);

      this.playerDecks.set(player1Id, deck1);
      this.playerDecks.set(player2Id, deck2);
      console.log(`[Lobby ${this.lobbyId}] Decks created from individual player selections (unique by question text, post-filtered).`);

      // Deal initial hands
      this._dealInitialHands(playerIds);

      // --- SAFETY CHECK: Always emit deal_cards to both players after dealing initial hands ---
      const io = socketService.getIo();
      for (const pId of playerIds) {
        const playerHand = this.playerHands.get(pId);
        const targetSocketId = socketService.findSocketIdByUserId(pId);
        if (targetSocketId && playerHand) {
          const handToSend = playerHand.slice(0, 5);
          io.to(targetSocketId).emit('deal_cards', {
            playerHand: handToSend.map(q => ({
              _id: q._id.toString(),
              text: q.questionText,
              options: q.choices,
              correctAnswer: q.correctAnswer,
              difficulty: q.difficulty,
              type: 'question'
            }))
          });
        } else {
          console.error(`[Safety] Could not find socket (${targetSocketId}) or hand (${playerHand?.length}) for player ${pId}`);
        }
      }

      // Transition state
      this.state = this.GAME_STATE.DICE_ROLL; // Use instance property
      console.log(`[Lobby ${this.lobbyId}] Decks created and hands dealt after card selection. Transitioning to ${this.state}.`);
      return true;
    } else {
      // Only one player has selected, wait for the other
      console.log(`[Lobby ${this.lobbyId}] Waiting for second player to confirm selection.`);
      return false;
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

      console.log(`[Lobby ${this.lobbyId}] Created deck for ${playerId} with ${deck.filter(c => c.type === 'question').length}Q / ${deck.filter(c => c.type === 'spellEffect').length}SE cards.`);
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
        throw new Error(`Insufficient cards in deck for player ${playerId} to deal initial hand.`);
      }

      // Initialize empty hand and text tracking set
      const hand = [];
      const handTexts = new Set();

      // Step 1: Draw unique cards until we have EXACTLY 5
      while (hand.length < 5 && deck.length > 0) {
        const card = deck.shift();
        const textKey = card.questionText?.trim().toLowerCase();

        // Only add if not a duplicate question text
        if (textKey && !handTexts.has(textKey)) {
          hand.push(card);
          handTexts.add(textKey);
        }
      }

      // If we couldn't get 5 unique cards, log an error
      if (hand.length < 5) {
        console.error(`[Lobby ${this.lobbyId}] Could only add ${hand.length} unique cards to hand for player ${playerId}.`);
      }

      // Step 2: STRICTLY limit hand to 5 cards (this should never trim if previous code works correctly)
      const finalHand = hand.slice(0, 5);

      // Step 3: Update player's hand in game state
      this.playerHands.set(playerId, finalHand);
      this.playerDecks.set(playerId, deck);

      console.log(`[Lobby ${this.lobbyId}] Dealt exactly ${finalHand.length} unique cards (by text) to ${playerId}. Hand size: ${finalHand.length}, Deck size: ${deck.length}`);
    });
  }

  // --- Method to draw a single card ---
  drawCard(playerId) {
    console.log(`[Lobby ${this.lobbyId}] Player ${playerId} attempting to draw card.`);
    const deck = this.playerDecks.get(playerId);
    const hand = this.playerHands.get(playerId);

    if (!deck || !hand) {
      console.error(`[Lobby ${this.lobbyId}] Error drawing card: Deck or hand not found for player ${playerId}.`);
      return null;
    }

    if (deck.length === 0) {
      console.log(`[Lobby ${this.lobbyId}] Player ${playerId} deck is empty. Cannot draw.`);
      return null;
    }

    // Only add the card if its questionText is not already in the hand
    let drawnCard = null;
    const handTexts = new Set(hand.map(c => c.questionText?.trim().toLowerCase()));
    while (deck.length > 0) {
      const candidate = deck.shift();
      const textKey = candidate.questionText?.trim().toLowerCase();
      if (textKey && !handTexts.has(textKey)) {
        hand.push(candidate);
        drawnCard = candidate;
        break;
      }
    }
    this.playerDecks.set(playerId, deck);
    this.playerHands.set(playerId, hand);
    console.log(`[Lobby ${this.lobbyId}] Player ${playerId} drew card ${drawnCard?._id || 'N/A'} (by text). Hand size: ${hand.length}, Deck size: ${deck.length}`);
    return drawnCard;
  }

  // --- Method for player to summon a question card ---
  summonQuestionCard(playerId, cardId) {
    console.log(`[Lobby ${this.lobbyId}] Player ${playerId} attempting to summon question card ${cardId}. Current state: ${this.state}, Turn: ${this.currentTurn}`);

    // --- Validation Checks ---
    if (this.currentTurn !== playerId) {
      throw new Error('It\'s not your turn.');
    }
    if (this.state !== this.GAME_STATE.AWAITING_CARD_SUMMON) { // Use instance property
      throw new Error(`Cannot summon card in current state: ${this.state}`);
    }
    if (this.hasSummonedQuestionThisTurn) {
      throw new Error('You have already summoned a question card this turn.');
    }
    // Prevent race condition: set flag immediately
    this.hasSummonedQuestionThisTurn = true;

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
    if (cardToSummon.type !== 'question' && !cardToSummon.questionText) {
      throw new Error('The selected card is not a Question Card.');
    }

    // --- Action --- 
    // Remove card from hand
    hand.splice(cardIndex, 1);
    this.playerHands.set(playerId, hand);

    // Set as active summoned card
    this.currentSummonedCard = cardToSummon;

    // Update turn flags and state
    this.state = this.GAME_STATE.AWAITING_OPPONENT_ANSWER; // Use instance property

    const opponentId = Array.from(this.players.keys()).find(id => id !== playerId);

    // Set a timeout for the answer (30 seconds)
    this.answerTimeout = setTimeout(() => {
      if (this.state === this.GAME_STATE.AWAITING_OPPONENT_ANSWER && this.currentSummonedCard) {
        console.log(`[Lobby ${this.lobbyId}] Answer timeout reached. Auto-resolving turn.`);
        // Submit null answer to indicate timeout
        this.submitAnswer(opponentId, null, this.currentSummonedCard._id.toString());
      }
    }, 30000); // 30 seconds timeout

    console.log(`[Lobby ${this.lobbyId}] Player ${playerId} successfully summoned card ${cardId}. State -> ${this.state}. Waiting for ${opponentId} to answer.`);

    // Return essential info for the controller/event emission
    return {
      success: true,
      summonedCard: {
        id: cardToSummon._id,
        text: cardToSummon.questionText,
        options: cardToSummon.choices,
        correctAnswer: cardToSummon.correctAnswer // Include correct answer for validation
      },
      attackerId: playerId,
      defenderId: opponentId,
      newState: this.state,
      timeLimit: 30 // Add time limit to the response
    };
  }

  // --- Method for player to play a spell/effect card ---
  playSpellEffectCard(playerId, cardId) {
    console.log(`[Lobby ${this.lobbyId}] Player ${playerId} attempting to play spell/effect card ${cardId}. Current state: ${this.state}, Turn: ${this.currentTurn}`);

    // --- Validation Checks ---
    if (this.currentTurn !== playerId) {
      throw new Error('It\'s not your turn.');
    }
    if (this.state !== this.GAME_STATE.AWAITING_CARD_SUMMON) { // Use instance property
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
      this.state = this.GAME_STATE.GAME_OVER; // Use instance property
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
      player.hp = Math.max(0, player.hp - amount);
      console.log(`[Lobby ${this.lobbyId}] Applied ${amount} damage to ${targetPlayerId}. New HP: ${player.hp}`);
    } else {
      console.warn(`[Lobby ${this.lobbyId}] Cannot apply damage, player ${targetPlayerId} not found.`);
    }
  }

  _healPlayer(targetPlayerId, amount) {
    const player = this.players.get(targetPlayerId);
    if (player) {
      // Heal but don't exceed maxHp
      player.hp = Math.min(player.maxHp, player.hp + amount);
      console.log(`[Lobby ${this.lobbyId}] Healed ${targetPlayerId} for ${amount}. New HP: ${player.hp}`);
    } else {
      console.warn(`[Lobby ${this.lobbyId}] Cannot heal, player ${targetPlayerId} not found.`);
    }
  }

  // --- Method for defender to submit their answer ---
  submitAnswer(playerId, answer, questionId) {
    console.log(`[Lobby ${this.lobbyId}] Player ${playerId} submitting answer. Current state: ${this.state}`);

    // --- Validation Checks ---
    if (this.state !== this.GAME_STATE.AWAITING_OPPONENT_ANSWER) {
      throw new Error(`Cannot submit answer in current state: ${this.state}`);
    }

    const attackerId = Array.from(this.players.keys()).find(id => id !== this.currentTurn);
    const defenderId = this.currentTurn;

    // Always compare as strings
    if (this.currentTurn?.toString() !== playerId?.toString()) {
      throw new Error('It\'s not your turn to answer.');
    }

    if (!this.currentSummonedCard) {
      throw new Error('No question card has been summoned.');
    }

    // Verify the question ID matches
    if (this.currentSummonedCard.id.toString() !== questionId) {
      throw new Error('Question ID mismatch.');
    }

    // Clear the timeout if it exists
    if (this.answerTimeout) {
      clearTimeout(this.answerTimeout);
      this.answerTimeout = null;
    }

    // Store the answer
    this.lastAnswer = answer;

    // Check if the answer is correct or if it's a timeout
    const isTimeout = answer === null;
    const isCorrect = !isTimeout && answer.trim() === this.currentSummonedCard.correctAnswer.trim();

    // Apply damage based on answer correctness or timeout
    // If correct, attacker takes damage (defender successfully defended)
    // If incorrect or timeout, defender takes damage (failed to defend)
    const damage = isCorrect ? 15 : 25; // 15 damage for correct answer, 25 for incorrect/timeout
    const targetId = isCorrect ? attackerId : defenderId;
    this._applyDamage(targetId, damage);

    // Check if the game is over
    const gameOver = this.isGameOver();
    const winnerId = gameOver ? this.getWinner() : null;

    // Get HP values
    const attackerHp = this.players.get(attackerId).hp;
    const defenderHp = this.players.get(defenderId).hp;

    // If game is not over, prepare for next turn
    if (!gameOver) {
      // Swap turn: defender becomes the new currentTurn (they get to attack next)
      this.currentTurn = defenderId;
      this._resetTurnFlags();
      this.state = this.GAME_STATE.AWAITING_CARD_SUMMON;

      // Draw a card for the new currentTurn player (defenderId)
      const drawnCard = this.drawCard(defenderId);
      const newHand = this.playerHands.get(defenderId) || [];
      const socketId = socketService.findSocketIdByUserId(defenderId);
      if (socketId) {
        const io = socketService.getIo();
        const handToSend = newHand.length > 5 ? [newHand[newHand.length - 1]] : newHand;
        io.to(socketId).emit('player_hand_update', {
          playerHand: handToSend.map(q => ({
            _id: q._id.toString(),
            text: q.questionText,
            options: q.choices,
            correctAnswer: q.correctAnswer,
            difficulty: q.difficulty,
            type: 'question'
          }))
        });
        console.log(`[Controller] Drew card and updated hand for player ${defenderId}`);
      }
    }

    return {
      success: true,
      isCorrect,
      isTimeout,
      submittedAnswer: answer,
      gameOver,
      winnerId,
      attackerHp,
      defenderHp,
      newState: this.state,
      newTurnPlayerId: gameOver ? null : defenderId
    };
  }

  // Method to handle setting a player's dice roll
  setDiceRoll(playerId, rollValue) {
    console.log(`[Lobby ${this.lobbyId}] setDiceRoll called for player ${playerId} with value ${rollValue}. Current state: ${this.state}`);
    if (this.state !== this.GAME_STATE.DICE_ROLL) { // Use instance property
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
        this.state = this.GAME_STATE.DICE_ROLL; // Use instance property (Stay in dice roll state)
        this.playerDiceRolls.clear(); // Clear rolls for the re-roll
        isTie = true;
      } else if (roll1 > roll2) {
        winnerId = player1Id;
        nextTurnPlayerId = player1Id; // Winner takes the first turn
        this.state = this.GAME_STATE.AWAITING_CARD_SUMMON; // Use instance property (Move to gameplay)
        this.currentTurn = nextTurnPlayerId;
        this.playerDiceRolls.clear(); // Clear rolls after determining winner
        console.log(`Player ${player1Id} wins roll (${roll1} vs ${roll2}). Next state: ${this.state}, Turn: ${this.currentTurn}`);
      } else { // roll2 > roll1
        winnerId = player2Id;
        nextTurnPlayerId = player2Id; // Winner takes the first turn
        this.state = this.GAME_STATE.AWAITING_CARD_SUMMON; // Use instance property (Move to gameplay)
        this.currentTurn = nextTurnPlayerId;
        this.playerDiceRolls.clear(); // Clear rolls after determining winner
        console.log(`Player ${player2Id} wins roll (${roll2} vs ${roll1}). Next state: ${this.state}, Turn: ${this.currentTurn}`);
      }

      // If not a tie, draw the first card for the player starting the game
      if (!isTie && nextTurnPlayerId) {
        // Only reset turn flags for the start of the first turn
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

// Update the createGame function to use the new class name and pass constants
exports.createGame = async (lobbyId) => {
  try {
    const game = new PvpGameInstance(lobbyId, RequiredGameStates); // Pass the required constants
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
      game.state = RequiredGameStates.RPS;
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
        game.currentTurn = winner; // <-- Set the turn to the RPS winner
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
exports.handleSubjectSelection = async (lobbyId, playerId, subject) => {
  try {
    const game = activeGames.get(lobbyId);
    if (!game) throw new Error('Game not found');
    // Check turn/state *before* calling setSubject
    if (!game.canSelectSubject(playerId)) throw new Error('Not player\'s turn or wrong state for subject selection');

    await game.setSubject(playerId, subject); // Updates state to DECK_CREATION

    // Use the subject ID stored reliably in the game instance
    const subjectIdToFetch = game.selectedSubject?.id || game.selectedSubject?._id;
    if (!subjectIdToFetch) {
      console.error(`[Lobby ${lobbyId}] Error: Could not retrieve subject ID from game instance after setSubject.`);
      throw new Error('Internal error processing subject selection.')
    }

    // Fetch questions for the selected subject using the stored ID
    console.log(`Fetching questions for subject ${subjectIdToFetch} in lobby ${lobbyId}`);
    const questions = await Question.find({ subject: subjectIdToFetch })
      .select('_id questionText choices correctAnswer difficulty type')
      .limit(30);

    // --- CORRECTED CHECK: Ensure at least 15 questions are available --- 
    const DECK_SELECTION_COUNT = 15; // Define locally for clarity
    if (!questions || questions.length < DECK_SELECTION_COUNT) {
      console.error(`Insufficient questions found for subject ${subjectIdToFetch}: Found ${questions?.length || 0}, Required: ${DECK_SELECTION_COUNT}`);
      // Update error message
      throw new Error(`Not enough questions available for subject: ${game.selectedSubject?.name || 'selected subject'}. Need at least ${DECK_SELECTION_COUNT}.`);
    }

    game.storeFetchedQuestions(questions); // Store questions on the game instance

    console.log(`Subject selection complete, ${questions.length} questions stored for lobby ${lobbyId}. State: ${game.state}`);
    // Inform clients that subject is selected and state is DECK_CREATION
    const io = socketService.getIo();
    io.to(lobbyId).emit('game_update', {
      gameState: game.state, // Use state from game instance (should be DECK_CREATION)
      selectedSubject: game.selectedSubject,
      availableQuestions: game.questions.map(q => ({ id: q._id, text: q.questionText })),
      currentTurn: game.currentTurn
    });
    console.log('[EMIT game_update]', {
      lobbyId,
      gameState: game.state,
      currentTurn: game.currentTurn,
      players: Array.from(game.players.keys()),
      currentSummonedCard: game.currentSummonedCard,
      state: game.state
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
    if (game.state !== RequiredGameStates.DECK_CREATION) throw new Error('Not in deck creation phase');

    // Assign cards and check if both players are done
    const readyToDeal = game.assignCards(playerId, selectedQuestionIds);

    if (readyToDeal) {
      const io = socketService.getIo();
      const playerIds = Array.from(game.players.keys());

      // Emit dealt hand to each player individually
      for (const pId of playerIds) {
        const playerHand = game.playerHands.get(pId);
        const targetSocketId = socketService.findSocketIdByUserId(pId);

        // Add detailed debug logs
        console.log(`[DEBUG] Player ${pId} hand before sending:`,
          playerHand ? { length: playerHand.length, firstText: playerHand[0]?.questionText } : 'No hand');

        if (targetSocketId && playerHand) {
          // Ensure we're only sending exactly 5 cards, no more
          const handToSend = playerHand.slice(0, 5);

          io.to(targetSocketId).emit('deal_cards', {
            playerHand: handToSend.map(q => ({
              _id: q._id.toString(),
              text: q.questionText,
              options: q.choices,
              correctAnswer: q.correctAnswer,
              difficulty: q.difficulty,
              type: 'question'
            }))
          });
          console.log(`Emitted deal_cards to player ${pId} with exactly ${handToSend.length} cards`);
        } else {
          console.error(`Could not find socket or hand for player ${pId} to emit deal_cards`);
        }
      }

      // Emit game update to lobby to change state to DICE_ROLL
      // IMPORTANT: Do NOT include playerHand in broadcast events - only in private events
      io.to(lobbyId).emit('game_update', {
        gameState: game.state,
        player1HandCount: game.playerHands.get(playerIds[0])?.length || 0,
        player2HandCount: game.playerHands.get(playerIds[1])?.length || 0,
        currentTurn: game.currentTurn
      });
      console.log('[EMIT game_update]', {
        lobbyId,
        gameState: game.state,
        currentTurn: game.currentTurn,
        players: Array.from(game.players.keys()),
        state: game.state
      });
    } else {
      // Optionally notify the lobby that one player is waiting
      const io = socketService.getIo();
      io.to(lobbyId).emit('game_message', { message: `Player ${game.players.get(playerId)?.name} confirmed selection. Waiting for opponent...` });
    }

    return game;
  } catch (error) {
    console.error('Error handling question selection:', error);
    throw error;
  }
};

// Handle answer submission
exports.handleSubmitAnswer = async (lobbyId, playerId, answer, questionId) => {
  console.log(`[Controller] handleSubmitAnswer called: lobby ${lobbyId}, player ${playerId}`);
  try {
    const game = activeGames.get(lobbyId);
    if (!game) throw new Error('Game not found');

    // Store previous HP for animation
    const previousDefenderHp = game.players.get(playerId)?.hp;

    // Call the game instance method
    const result = game.submitAnswer(playerId, answer, questionId);

    if (result && result.success) {
      const io = socketService.getIo();
      if (!io) throw new Error("Socket service not available");

      // Calculate HP change for animation
      const hpChange = previousDefenderHp - result.defenderHp;
      const damageAmount = result.isCorrect ? 15 : 25; // 15 for correct, 25 for incorrect

      // Get player IDs for the game
      const playerIds = Array.from(game.players.keys());
      const player1Id = playerIds[0];
      const player2Id = playerIds[1];

      // Determine the appropriate message based on the result
      let feedbackMessage;
      if (result.isTimeout) {
        feedbackMessage = `Time's up! No answer submitted. You take ${damageAmount} damage!`;
      } else if (result.isCorrect) {
        feedbackMessage = 'Correct Answer! Opponent takes 15 damage!';
      } else {
        feedbackMessage = `Incorrect Answer! You take ${damageAmount} damage!`;
      }

      // Emit immediate answer result with feedback
      // Send to both players with a resultRole field
      [player1Id, player2Id].forEach(pid => {
        io.to(socketService.findSocketIdByUserId(pid)).emit('answer_result', {
          isCorrect: result.isCorrect,
          isTimeout: result.isTimeout,
          submittedAnswer: result.submittedAnswer,
          attackerId: player1Id,
          defenderId: player2Id,
          attackerHp: result.attackerHp,
          defenderHp: result.defenderHp,
          resultRole: pid === player2Id ? 'answerer' : 'asker',
          message: feedbackMessage,
          hpChange: {
            amount: hpChange,
            target: result.defenderId,
            previousHp: previousDefenderHp,
            newHp: result.defenderHp,
            damageAmount: damageAmount
          }
        });
      });

      // If game is over, handle game over state
      if (result.gameOver) {
        console.log(`[Controller] Game Over detected in lobby ${lobbyId}. Winner: ${result.winnerId}`);
        const winner = game.players.get(result.winnerId);
        const loserId = playerIds.find(id => id !== result.winnerId);
        const loser = game.players.get(loserId);

        const gameOverPayload = {
          winnerId: result.winnerId,
          winnerName: winner?.name || 'Winner',
          reason: `${loser?.name || 'Loser'} lost all HP!`,
          finalPlayer1Hp: result.attackerHp,
          finalPlayer2Hp: result.defenderHp
        };

        io.to(lobbyId).emit('game_over', gameOverPayload);
        console.log('[Controller] Emitted game_over event.');

        // Clean up the game instance from memory
        activeGames.delete(lobbyId);
        console.log('Game instance removed from memory:', lobbyId);
      } else {
        // If game continues, emit update for the new turn
        console.log(`[Controller] Answer resolved, game continues. Emitting game_update for new turn. New state: ${result.newState}, Next turn: ${result.newTurnPlayerId}`);

        // Get the current player's hand to send to them
        const currentTurnPlayerId = result.newTurnPlayerId;
        const currentTurnPlayerHand = game.playerHands.get(currentTurnPlayerId) || [];

        // Ensure game state is updated in the game instance
        game.state = result.newState;

        // Send general game state update to everyone
        io.to(lobbyId).emit('game_update', {
          gameState: result.newState,
          currentTurn: result.newTurnPlayerId,
          player1Hp: result.attackerHp,
          player2Hp: result.defenderHp,
          player1HandCount: game.playerHands.get(player1Id)?.length || 0,
          player2HandCount: game.playerHands.get(player2Id)?.length || 0,
          hpChange: {
            amount: hpChange,
            target: result.defenderId,
            previousHp: previousDefenderHp,
            newHp: result.defenderHp,
            damageAmount: damageAmount
          },
          gameMessage: `Turn resolved. It\'s ${game.players.get(result.newTurnPlayerId)?.name}\'s turn!`,
          currentTurn: result.newTurnPlayerId
        });
        console.log('[EMIT game_update]', {
          lobbyId,
          gameState: result.newState,
          currentTurn: result.newTurnPlayerId,
          players: Array.from(game.players.keys()),
          currentSummonedCard: game.currentSummonedCard,
          state: game.state
        });

        // Send the hand to the current player privately
        const currentPlayerSocketId = socketService.findSocketIdByUserId(currentTurnPlayerId);
        if (currentPlayerSocketId) {
          io.to(currentPlayerSocketId).emit('player_hand_update', {
            playerHand: currentTurnPlayerHand.map(q => ({
              _id: q._id.toString(),
              text: q.questionText,
              options: q.choices,
              correctAnswer: q.correctAnswer,
              difficulty: q.difficulty,
              type: q.type || 'question'
            }))
          });
          console.log(`[Controller] Sent private hand update to player ${currentTurnPlayerId}`);
        }
      }

      return game.state !== RequiredGameStates.GAME_OVER ? game : null;
    }
  } catch (error) {
    console.error(`Error handling submit_answer for player ${playerId} in lobby ${lobbyId}:`, error);
    // Emit error back to the specific player
    const errorSocketId = socketService.findSocketIdByUserId(playerId);
    if (errorSocketId) {
      const io = socketService.getIo();
      if (io) io.to(errorSocketId).emit('game_error', { message: error.message || 'Failed to submit answer' });
    }
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

    game.state = RequiredGameStates.COMPLETED; // Use RequiredGameStates
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
        console.log(`[Disconnect] Found player ${playerId} in lobby ${lobbyId}. Setting state.`);
        // Check if game instance still exists and has the GAME_STATE property
        if (game && game.GAME_STATE) {
          game.state = game.GAME_STATE.COMPLETED; // Preferably use instance state if available
        } else {
          // Fallback if instance or property missing (should not happen ideally)
          console.warn(`[Disconnect] Game instance or GAME_STATE missing for lobby ${lobbyId}. Using RequiredGameStates.`);
          // game.state = RequiredGameStates.COMPLETED; // Set state directly if needed as fallback
        }
        const otherPlayerId = Array.from(game.players.keys())
          .find(id => id !== playerId);

        if (otherPlayerId) {
          const opponentSocketId = socketService.findSocketIdByUserId(otherPlayerId);
          console.log(`[Disconnect] Notifying opponent ${otherPlayerId} in lobby ${lobbyId}.`);
          // Get io instance
          const io = socketService.getIo();
          if (io && opponentSocketId) {
            io.to(opponentSocketId).emit('opponent_disconnected', {
              message: `Player ${game.players.get(playerId)?.name || 'Opponent'} disconnected.`,
              lobbyId
            });
            console.log(`[Disconnect] Emitted opponent_disconnected to ${opponentSocketId}.`);
          } else {
            console.warn(`[Disconnect] Could not get io instance or opponent socket ID for lobby ${lobbyId}.`);
          }
          socketService.emitEvent('player_disconnected', { // This might be redundant if handled above
            lobbyId,
            disconnectedPlayer: playerId
          });
        }

        console.log(`[Disconnect] Removing game instance ${lobbyId} due to player ${playerId} disconnect.`);
        activeGames.delete(lobbyId);
      }
    }
  } catch (error) {
    console.error('Error handling disconnect:', error);
    // Avoid throwing error here as it might crash server during normal disconnect
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
    if (game.state !== RequiredGameStates.DICE_ROLL) {
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

        // BROADCAST update WITHOUT playerHand (remove it)
        io.to(lobbyId).emit('game_update', {
          gameState: diceResult.newState,
          currentTurn: diceResult.nextTurn,
          player1Hp: player1?.hp,
          player2Hp: player2?.hp,
          player1HandCount: game.playerHands.get(diceResult.player1Id)?.length || 0,
          player2HandCount: game.playerHands.get(diceResult.player2Id)?.length || 0,
          gameMessage: `Dice roll complete. ${game.players.get(diceResult.winnerId)?.name} goes first!`,
          currentTurn: diceResult.nextTurn
        });

        // PRIVATE hand update to the winner only
        const winnerSocketId = socketService.findSocketIdByUserId(diceResult.nextTurn);
        if (winnerSocketId) {
          const winnerHand = game.playerHands.get(diceResult.nextTurn) || [];
          // Ensure we send exactly 5 cards max
          io.to(winnerSocketId).emit('player_hand_update', {
            playerHand: winnerHand.slice(0, 5).map(q => ({
              _id: q._id.toString(),
              text: q.questionText,
              options: q.choices,
              correctAnswer: q.correctAnswer,
              difficulty: q.difficulty,
              type: 'question'
            }))
          });
          console.log(`[Controller] Sent private hand update to winner ${diceResult.nextTurn} with ${winnerHand.slice(0, 5).length} cards`);
        }

        console.log('[EMIT game_update]', {
          lobbyId,
          gameState: diceResult.newState,
          currentTurn: diceResult.nextTurn,
          players: Array.from(game.players.keys()),
          state: game.state
        });

        // Set the turn to the dice roll winner
        game.currentTurn = diceResult.nextTurn;
        // Only reset turn flags for the start of the first turn
        game._resetTurnFlags();
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
        io.to(attackerSocketId).emit('player_hand_update', {
          playerHand: (game.playerHands.get(attackerId) || []).map(q => ({
            _id: q._id.toString(),
            text: q.questionText,
            options: q.choices,
            correctAnswer: q.correctAnswer,
            difficulty: q.difficulty,
            type: 'question'
          }))
        });
        console.log(`[Controller] Emitted private hand update to attacker ${attackerId}`);
      }

      // 2. Present question to defender (send privately)
      if (defenderSocketId) {
        const questionData = {
          question: {
            id: result.summonedCard.id,
            text: result.summonedCard.text,
            options: result.summonedCard.options,
            correctAnswer: result.summonedCard.correctAnswer,
            type: 'question'
          },
          attackerName: game.players.get(attackerId)?.name || 'Opponent',
          timeLimit: 30 // Add time limit for answering
        };

        io.to(defenderSocketId).emit('question_presented', questionData);
        console.log(`[Controller] Emitted question_presented to defender ${defenderId} with question:`, questionData);
      } else {
        console.error(`[Controller] Could not find socket ID for defender ${defenderId}`);
      }

      // 3. Update lobby state (broadcast)
      // Set turn to defender for answering
      game.currentTurn = defenderId.toString();
      const gameUpdateData = {
        gameState: result.newState, // AWAITING_OPPONENT_ANSWER
        currentTurn: game.currentTurn, // Now set to defender
        lastCardSummoned: { // Info for field display
          cardId: result.summonedCard.id,
          playerId: attackerId,
          text: result.summonedCard.text,
          options: result.summonedCard.options,
          type: 'question'
        },
        gameMessage: `${game.players.get(attackerId)?.name} summoned a question! Waiting for ${game.players.get(defenderId)?.name} to answer.`,
        // Add question info to game update for both players
        currentQuestion: {
          id: result.summonedCard.id,
          text: result.summonedCard.text,
          options: result.summonedCard.options,
          type: 'question'
        }
      };

      // Ensure game state is updated in the game instance
      game.state = result.newState;

      // Emit the game update to all players
      io.to(lobbyId).emit('game_update', gameUpdateData);
      console.log('[EMIT game_update]', {
        lobbyId,
        gameState: result.newState,
        currentTurn: game.currentTurn,
        players: Array.from(game.players.keys()),
        currentSummonedCard: game.currentSummonedCard,
        state: game.state
      });

    } else {
      // Should not happen if summonQuestionCard throws errors correctly
      console.warn(`[Controller] summonQuestionCard for lobby ${lobbyId} did not return a successful result object.`);
    }

    return game;

  } catch (error) {
    console.error(`[Controller] Error handling summon card for player ${playerId} in lobby ${lobbyId}:`, error);
    // Emit error back to the specific player
    const errorSocketId = socketService.findSocketIdByUserId(playerId);
    if (errorSocketId) {
      const io = socketService.getIo();
      if (io) io.to(errorSocketId).emit('game_error', { message: error.message || 'Failed to summon card' });
    }
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
        gameMessage: `${player1.name} played a spell/effect! ${result.effectApplied?.description || 'Effect resolved.'}`,
        currentTurn: game.currentTurn
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
          reason: `${loser?.name || 'Winner'} won via card effect!`,
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
    return game.state !== RequiredGameStates.GAME_OVER ? game : null;

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

// Add this new controller function for handling request_initial_cards
exports.handleRequestInitialCards = async (lobbyId, playerId) => {
  try {
    const game = activeGames.get(lobbyId);
    if (!game) throw new Error('Game not found');

    console.log(`[Controller] Player ${playerId} requested initial cards for lobby ${lobbyId}`);

    const io = socketService.getIo();
    if (!io) throw new Error("Socket service not available");

    // Get all player IDs for the game
    const playerIds = Array.from(game.players.keys());

    // For each player, re-emit their hand as a private deal_cards event
    for (const pId of playerIds) {
      const playerHand = game.playerHands.get(pId);
      const targetSocketId = socketService.findSocketIdByUserId(pId);

      if (targetSocketId && playerHand) {
        const handToSend = playerHand.slice(0, 5);
        console.log(`[Initial Cards] Re-emitting deal_cards to player ${pId} (socket: ${targetSocketId}) with ${handToSend.length} cards`);
        console.log(`[Initial Cards] Hand contents:`, handToSend.map(q => q.questionText || q.text));

        io.to(targetSocketId).emit('deal_cards', {
          playerHand: handToSend.map(q => ({
            _id: q._id.toString(),
            text: q.questionText,
            options: q.choices,
            correctAnswer: q.correctAnswer,
            difficulty: q.difficulty,
            type: 'question'
          }))
        });
      } else {
        console.error(`[Initial Cards] Could not find socket (${targetSocketId}) or hand (${playerHand?.length}) for player ${pId}`);
      }
    }

    // Also emit a game_update to ensure all clients have the current game state
    io.to(lobbyId).emit('game_update', {
      gameState: game.state,
      currentTurn: game.currentTurn,
      player1HandCount: game.playerHands.get(playerIds[0])?.length || 0,
      player2HandCount: game.playerHands.get(playerIds[1])?.length || 0,
      player1DeckCount: game.playerDecks.get(playerIds[0])?.length || 0,
      player2DeckCount: game.playerDecks.get(playerIds[1])?.length || 0,
      gameMessage: `Cards have been dealt. ${game.players.get(game.currentTurn)?.name || 'Current player'}'s turn to play.`
    });

    return game;
  } catch (error) {
    console.error(`[Controller] Error handling request_initial_cards:`, error);
    throw error;
  }
};