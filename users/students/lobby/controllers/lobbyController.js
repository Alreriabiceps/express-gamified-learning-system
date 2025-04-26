const Lobby = require('../models/lobbyModel');

// Create a new lobby
exports.createLobby = async (req, res) => {
    try {
        const { name, isPrivate, password } = req.body;
        const userId = req.user._id;

        // Check if user already has an active open lobby
        if (!isPrivate) {
            const existingLobby = await Lobby.findOne({
                hostId: userId,
                isPrivate: false,
                status: 'waiting',
                expiresAt: { $gt: new Date() }
            });

            if (existingLobby) {
                return res.status(400).json({
                    success: false,
                    error: 'You already have an active open lobby. Please wait for it to expire or create a private lobby.'
                });
            }
        }

        // Set expiration time for open lobbies (3 minutes from now)
        const expiresAt = isPrivate ? undefined : new Date(Date.now() + 3 * 60 * 1000);

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

// Leave a lobby
exports.leaveLobby = async (req, res) => {
    try {
        const { lobbyId } = req.params;
        const playerId = req.user.id;

        const lobby = await Lobby.findById(lobbyId);
        if (!lobby) {
            return res.status(404).json({
                success: false,
                message: 'Lobby not found'
            });
        }

        lobby.players = lobby.players.filter(id => id.toString() !== playerId);

        if (lobby.players.length === 0) {
            await lobby.remove();
            return res.json({
                success: true,
                message: 'Lobby deleted as it is now empty'
            });
        }

        if (lobby.hostId.toString() === playerId) {
            lobby.hostId = lobby.players[0];
        }

        await lobby.save();
        await lobby.populate('players', 'firstName lastName');

        res.json({
            success: true,
            data: lobby
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 