const mongoose = require('mongoose');
const socketService = require('../../../../services/socketService');

const lobbySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
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
        ref: 'Student'
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
    expiresAt: {
        type: Date,
        required: function () {
            return !this.isPrivate;
        }
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Static method to clean up expired lobbies
lobbySchema.statics.cleanupExpiredLobbies = async function () {
    try {
        // Find expired lobbies before deleting them
        const expiredLobbies = await this.find({
            $or: [
                { expiresAt: { $lt: new Date() } },
                { status: 'completed' }
            ]
        });

        // Delete the expired lobbies
        const result = await this.deleteMany({
            $or: [
                { expiresAt: { $lt: new Date() } },
                { status: 'completed' }
            ]
        });

        // Emit lobby:deleted event for each expired lobby
        expiredLobbies.forEach(lobby => {
            socketService.emitEvent('lobby:deleted', { lobbyId: lobby._id });
        });

        console.log(`Cleaned up ${result.deletedCount} expired lobbies`);
        return result;
    } catch (error) {
        console.error('Error cleaning up expired lobbies:', error);
        throw error;
    }
};

module.exports = mongoose.model('Lobby', lobbySchema); 