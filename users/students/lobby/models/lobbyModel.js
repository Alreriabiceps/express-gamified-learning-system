const mongoose = require('mongoose');

const lobbySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        required: function () {
            return this.isPrivate;
        }
    },
    players: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    maxPlayers: {
        type: Number,
        default: 2
    },
    status: {
        type: String,
        enum: ['waiting', 'in-progress', 'completed'],
        default: 'waiting'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: function () {
            return !this.isPrivate;
        }
    }
});

// Static method to clean up expired lobbies
lobbySchema.statics.cleanupExpiredLobbies = async function () {
    try {
        const result = await this.deleteMany({
            $or: [
                { expiresAt: { $lt: new Date() } },
                { status: 'waiting', players: { $size: 0 } }
            ]
        });
        console.log(`Cleaned up ${result.deletedCount} expired lobbies`);
        return result;
    } catch (error) {
        console.error('Error cleaning up expired lobbies:', error);
        throw error;
    }
};

module.exports = mongoose.model('Lobby', lobbySchema); 