const Lobby = require('../models/lobbyModel');
const User = require('../../../auth/models/userModel');

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
        const userId = req.user._id;

        // Check if user already has an active lobby (either private or open)
        const existingLobby = await Lobby.findOne({
            hostId: userId,
            status: 'waiting',
            expiresAt: { $gt: new Date() }
        });

        if (existingLobby) {
            return res.status(400).json({
                success: false,
                error: 'You already have an active lobby. Please wait for it to expire or delete it before creating a new one.'
            });
        }

        // Set expiration time for all lobbies (3 minutes from now)
        const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

        // Create new lobby
        const lobby = new Lobby({
            name,
            hostId: userId,
            isPrivate,
            password: isPrivate ? password : undefined,
            players: [userId],
            expiresAt
        });

        await lobby.save();

        // Populate host information
        await lobby.populate('hostId', 'firstName lastName');

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
        // Run cleanup before fetching lobbies
        await cleanupExpiredLobbies();

        const lobbies = await Lobby.find({
            status: 'waiting',
            $or: [
                { isPrivate: true },
                { expiresAt: { $gt: new Date() } }
            ]
        })
            .populate('hostId', 'firstName lastName')
            .populate('players', 'firstName lastName');

        // Add time remaining for each lobby
        const lobbiesWithTimeRemaining = lobbies.map(lobby => {
            const lobbyObj = lobby.toObject();
            if (!lobby.isPrivate && lobby.expiresAt) {
                const timeRemaining = Math.max(0, Math.floor((lobby.expiresAt - new Date()) / 1000));
                lobbyObj.timeRemaining = timeRemaining;
            }
            return lobbyObj;
        });

        res.status(200).json({
            success: true,
            data: lobbiesWithTimeRemaining
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
        const userId = req.user._id;

        const lobby = await Lobby.findById(lobbyId);

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

        // Check if lobby has expired
        if (!lobby.isPrivate && lobby.expiresAt && lobby.expiresAt < new Date()) {
            // Delete expired lobby
            await lobby.deleteOne();
            return res.status(400).json({
                success: false,
                error: 'Lobby has expired'
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

        if (lobby.players.includes(userId)) {
            return res.status(400).json({
                success: false,
                error: 'You are already in this lobby'
            });
        }

        lobby.players.push(userId);
        await lobby.save();

        await lobby.populate('hostId', 'firstName lastName');
        await lobby.populate('players', 'firstName lastName');

        // Add time remaining to response
        const lobbyObj = lobby.toObject();
        if (!lobby.isPrivate && lobby.expiresAt) {
            const timeRemaining = Math.max(0, Math.floor((lobby.expiresAt - new Date()) / 1000));
            lobbyObj.timeRemaining = timeRemaining;
        }

        res.status(200).json({
            success: true,
            data: lobbyObj
        });
    } catch (error) {
        console.error('Error joining lobby:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to join lobby'
        });
    }
}; 