const cron = require('node-cron');
const { cleanupOldMessages } = require('../users/students/chats/controllers/messageController');

// Schedule cleanup to run daily at 2:00 AM
const startMessageCleanup = () => {
  console.log('🕐 Starting message cleanup scheduler...');
  
  // Run cleanup daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running scheduled message cleanup...');
    await cleanupOldMessages();
  }, {
    scheduled: true,
    timezone: "Asia/Manila" // Adjust to your timezone
  });
  
  // Also run cleanup on server startup (after 5 seconds delay)
  setTimeout(async () => {
    console.log('🧹 Running startup message cleanup...');
    await cleanupOldMessages();
  }, 5000);
  
  console.log('✅ Message cleanup scheduler started successfully');
};

module.exports = { startMessageCleanup }; 