const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../../../auth/authMiddleware');
const lobbyController = require('../controllers/lobbyController');

// Create a new lobby
router.post('/', verifyToken, lobbyController.createLobby);

// Get all lobbies
router.get('/', verifyToken, lobbyController.getLobbies);

// Join a lobby
router.post('/:lobbyId/join', verifyToken, lobbyController.joinLobby);

// Delete a lobby
router.delete('/:lobbyId', verifyToken, lobbyController.deleteLobby);

module.exports = router; 