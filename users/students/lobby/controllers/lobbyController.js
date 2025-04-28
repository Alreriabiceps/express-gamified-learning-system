const Lobby = require('../models/lobbyModel');
const Student = require('../../../../users/admin/student/models/studentModels');
const { io } = require('../../../../server');

// Cleanup function to remove expired lobbies
const cleanupExpiredLobbies = async () => {
    try {
        await Lobby.cleanupExpiredLobbies();
    } catch (error) {
        console.error('Error in cleanup task:', error);
    }
};

// Run cleanup every minute
setInterval(cleanupExpiredLobbies, 60 * 1000);

// Create a new lobby
exports.createLobby = async (req, res) => {
    try {
        const { name, isPrivate, password } = req.body;
        const userId = req.user.id;

        // Check if user already has an active lobby
        const existingLobby = await Lobby.findOne({
            $or: [
                { hostId: userId, status: 'waiting' },
                { players: userId, status: 'waiting' }
            ]
        });

        if (existingLobby) {
            return res.status(400).json({
                success: false,
                error: 'You are already in a lobby'
            });
        }

        // Create new lobby
        const lobby = new Lobby({
            name: name || 'Open Lobby',
            hostId: userId,
            isPrivate,
            password: isPrivate ? password : undefined,
            players: [userId], // Add creator as first player
            status: 'waiting',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        });

        await lobby.save();
        await lobby.populate('hostId', 'firstName lastName');
        await lobby.populate('players', 'firstName lastName');

        // Emit lobby created event
        io.emit('lobby:created', lobby);

        res.status(201).json({
            success: true,
            data: lobby
        });
    } catch (error) {
        console.error('Error creating lobby:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create lobby'
        });
    }
};

// Get all lobbies
exports.getLobbies = async (req, res) => {
    try {
        const lobbies = await Lobby.find({
            status: 'waiting',
            $or: [
                { isPrivate: true },
                { expiresAt: { $gt: new Date() } }
            ]
        })
        .populate('hostId', 'firstName lastName')
        .populate('players', 'firstName lastName');

        res.status(200).json({
            success: true,
            data: lobbies
        });
    } catch (error) {
        console.error('Error fetching lobbies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch lobbies'
        });
    }
};

// Join a lobby
exports.joinLobby = async (req, res) => {
    try {
        const { lobbyId } = req.params;
        const { password } = req.body;
        const userId = req.user.id;

        // Check if user is already in any lobby
        const userInLobby = await Lobby.findOne({
            players: userId,
            status: 'waiting'
        });

        if (userInLobby) {
            return res.status(400).json({
                success: false,
                error: 'You are already in a lobby'
            });
        }

        const lobby = await Lobby.findById(lobbyId)
            .populate('hostId', 'firstName lastName')
            .populate('players', 'firstName lastName');

        if (!lobby) {
            return res.status(404).json({
                success: false,
                error: 'Lobby not found'
            });
        }

        if (lobby.status !== 'waiting') {
            return res.status(400).json({
                success: false,
                error: 'Lobby is not available for joining'
            });
        }

        if (lobby.players.length >= lobby.maxPlayers) {
            return res.status(400).json({
                success: false,
                error: 'Lobby is full'
            });
        }

        if (lobby.isPrivate && lobby.password !== password) {
            return res.status(401).json({
                success: false,
                error: 'Invalid password'
            });
        }

        // Add player to lobby
        lobby.players.push(userId);
        
        // Check if lobby is full
        if (lobby.players.length === lobby.maxPlayers) {
            lobby.status = 'in-progress';
        }
        
        await lobby.save();
        await lobby.populate('players', 'firstName lastName');

        // Emit lobby updated event
        io.emit('lobby:updated', lobby);

        // If lobby is full, emit game start event
        if (lobby.status === 'in-progress') {
            io.emit('game:start', {
                lobbyId: lobby._id,
                lobbyName: lobby.name,
                players: lobby.players
            });
        }

        res.status(200).json({
            success: true,
            data: lobby
        });
    } catch (error) {
        console.error('Error joining lobby:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to join lobby'
        });
    }
}; 