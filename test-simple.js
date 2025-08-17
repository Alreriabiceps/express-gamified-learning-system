const mongoose = require('mongoose');
require('dotenv').config();

async function testSimple() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Test creating a simple game room with minimal data
    const GameRoom = require('./models/GameRoom');
    
    const simpleGameState = {
      roomId: 'test_room_' + Date.now(),
      gameId: 'test_game_' + Date.now(),
      lobbyId: new mongoose.Types.ObjectId(),
      players: [
        {
          userId: 'user1',
          username: 'Player1',
          hp: 100,
          maxHp: 100,
          cards: [
            {
              id: 'card1',
              type: 'question',
              question: 'What is 2+2?',
              choices: ['3', '4', '5', '6'],
              answer: '4',
              bloom_level: 'Remembering',
              spell_type: '',
              name: '',
              description: '',
              icon: '',
              color: '',
              bgColor: ''
            }
          ],
          powerUps: {
            double_damage: { available: false, used: false },
            shield: { available: false, used: false },
            hint_reveal: { available: false, used: false },
            extra_turn: { available: false, used: false },
            card_draw: { available: false, used: false },
            fifty_fifty: { available: false, used: false },
          },
          activatedSpells: []
        }
      ],
      currentTurn: 'user1',
      gamePhase: 'cardSelection',
      deck: [
        {
          id: 'deck1',
          type: 'question',
          question: 'What is 3+3?',
          choices: ['5', '6', '7', '8'],
          answer: '6',
          bloom_level: 'Remembering',
          spell_type: '',
          name: '',
          description: '',
          icon: '',
          color: '',
          bgColor: ''
        }
      ],
      selectedCard: null,
      gameState: 'playing',
      winner: null,
      powerUpEffects: {
        doubleDamage: false,
        shield: false,
        hintReveal: false,
        extraTurn: false,
        fiftyFifty: false,
      }
    };

    console.log('🎮 Testing simple game room creation...');
    console.log('Deck length:', simpleGameState.deck.length);
    console.log('Deck type:', typeof simpleGameState.deck);
    console.log('First deck item type:', typeof simpleGameState.deck[0]);

    const gameRoom = new GameRoom(simpleGameState);
    await gameRoom.save();
    
    console.log('✅ Simple game room created successfully!');

    // Cleanup
    await GameRoom.findOneAndDelete({ roomId: simpleGameState.roomId });
    console.log('🧹 Cleanup completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testSimple();
