const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../../../auth/authMiddleware');
const {
    createLobby,
    getLobbies,
    joinLobby
} = require('../controllers/lobbyController');

// Create a new lobby
router.post('/', verifyToken, createLobby);

// Get all lobbies
router.get('/', verifyToken, getLobbies);

// Join a lobby
router.post('/:lobbyId/join', verifyToken, joinLobby);

module.exports = router; 