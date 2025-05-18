const Lobby = require('../models/lobbyModel');
const Student = require('../../../../users/admin/student/models/studentModels');
const socketService = require('../../../../services/socketService');
const { gameServer } = require('../../../../server');

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
                error: 'You already have an active lobby. Please wait for it to expire before creating a new one.'
            });
        }

        // Validate required fields
        if (isPrivate && !password) {
            return res.status(400).json({
                success: false,
                error: 'Password is required for private lobbies'
            });
        }

        // Create new lobby
        const lobby = new Lobby({
            name: name || 'Open Lobby',
            hostId: userId,
            isPrivate,
            password: isPrivate ? password : undefined,
            players: [userId], // Add host as first player
            status: 'waiting',
            expiresAt: new Date(Date.now() + 3 * 60 * 1000) // 3 minutes
        });

        // Save the lobby
        await lobby.save();
        
        // Populate host and player information
        await lobby.populate('hostId', 'firstName lastName');
        await lobby.populate('players', 'firstName lastName');

        // Emit lobby created event
        socketService.emitEvent('lobby:created', lobby);

        return res.status(201).json({
            success: true,
            data: lobby
        });
    } catch (error) {
        console.error('Error creating lobby:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to save lobby'
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
            $or: [
                { hostId: userId, status: 'waiting' },
                { players: userId, status: 'waiting' }
            ]
        });

        if (userInLobby) {
            return res.status(400).json({
                success: false,
                error: 'You already have an active lobby'
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

        // Check if user is trying to join their own lobby
        if (lobby.hostId._id.toString() === userId) {
            return res.status(400).json({
                success: false,
                error: 'You cannot join your own lobby'
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
        socketService.emitEvent('lobby:updated', lobby);

        // If lobby is full, emit game start event
        if (lobby.status === 'in-progress') {
            const io = req.app.get('io');
            if (io) {
                lobby.players.forEach(player => {
                    io.to(player._id ? player._id.toString() : player.toString()).emit('game:start', {
                        gameId: lobby._id,
                        players: lobby.players,
                    });
                });
            } else {
                console.error('Socket.io instance not found on app!');
            }
            if (gameServer) {
                gameServer.createGameFromLobby(lobby);
            }
        }

        return res.status(200).json({
            success: true,
            data: lobby
        });
    } catch (error) {
        console.error('Error joining lobby:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to join lobby'
        });
    }
};

// Delete a lobby
exports.deleteLobby = async (req, res) => {
    try {
        const { lobbyId } = req.params;
        const userId = req.user.id;

        const lobby = await Lobby.findById(lobbyId);

        if (!lobby) {
            return res.status(404).json({
                success: false,
                error: 'Lobby not found'
            });
        }

        // Only allow host to delete the lobby
        if (lobby.hostId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Only the lobby host can delete this lobby'
            });
        }

        // Delete the lobby
        await lobby.deleteOne();

        // Emit lobby deleted event
        socketService.emitEvent('lobby:deleted', { lobbyId: lobby._id });

        return res.status(200).json({
            success: true,
            message: 'Lobby deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting lobby:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete lobby'
        });
    }
}; 