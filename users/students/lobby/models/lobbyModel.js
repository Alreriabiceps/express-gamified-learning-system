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
}, {
    timestamps: true
});

// Add indexes for better query performance
lobbySchema.index({ status: 1, isPrivate: 1 });
lobbySchema.index({ hostId: 1 });
lobbySchema.index({ players: 1 });
lobbySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Lobby', lobbySchema); 