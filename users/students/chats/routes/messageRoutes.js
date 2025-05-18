const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../../../auth/authMiddleware');
const messageController = require('../controllers/messageController');

// Get chat history with a friend
router.get('/:friendId', verifyToken, messageController.getMessages);
// Send a new message
router.post('/', verifyToken, messageController.sendMessage);

module.exports = router; 