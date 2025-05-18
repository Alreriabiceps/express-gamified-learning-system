const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../../../auth/authMiddleware');
const friendRequestController = require('../controllers/friendRequestController');

// Send a friend request
router.post('/send', verifyToken, friendRequestController.sendRequest);
// Accept a friend request
router.post('/accept', verifyToken, friendRequestController.acceptRequest);
// Get all friends
router.get('/friends', verifyToken, friendRequestController.getFriends);
// Get pending requests
router.get('/pending', verifyToken, friendRequestController.getPendingRequests);
// Remove a friend
router.delete('/friend/:friendId', verifyToken, friendRequestController.removeFriend);
// Cancel a pending request
router.delete('/request/:requestId', verifyToken, friendRequestController.cancelRequest);

module.exports = router; 