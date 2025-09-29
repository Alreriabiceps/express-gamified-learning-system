const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../../../auth/authMiddleware');
const messageController = require('../controllers/messageController');

// Get chat history with a friend
router.get('/:friendId', verifyToken, messageController.getMessages);
// Send a new message
router.post('/', verifyToken, messageController.sendMessage);
// Manual cleanup endpoint (for testing/admin)
router.delete('/cleanup', verifyToken, async (req, res) => {
  try {
    const deletedCount = await messageController.cleanupOldMessages();
    res.json({ 
      success: true, 
      message: `Cleaned up ${deletedCount} messages older than 3 days`,
      deletedCount 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 