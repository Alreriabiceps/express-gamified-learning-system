const mongoose = require('mongoose');
const gameEngine = require('./services/gameEngine');
require('dotenv').config();

async function testGameInit() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🎮 Testing game initialization...');
    const testPlayers = [
      { userId: 'test_user_1', username: 'TestPlayer1' },
      { userId: 'test_user_2', username: 'TestPlayer2' }
    ];

    const gameState = await gameEngine.initializeGame(
      'test_room_' + Date.now(),
      testPlayers,
      new mongoose.Types.ObjectId()
    );

    console.log('✅ Game initialization successful!');
    console.log('Game ID:', gameState.gameId);
    console.log('Room ID:', gameState.roomId);
    console.log('Players:', gameState.players.length);
    console.log('Deck size:', gameState.deck.length);

    // Cleanup
    await gameEngine.cleanupGame(gameState.roomId);
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

testGameInit();

