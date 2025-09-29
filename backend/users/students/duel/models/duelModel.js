const mongoose = require('mongoose');

const duelSchema = new mongoose.Schema({
    challenger: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    opponent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    }],
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'in-progress', 'completed'],
        default: 'pending'
    },
    challengerScore: {
        type: Number,
        default: 0
    },
    opponentScore: {
        type: Number,
        default: 0
    },
    pointsGained: {
        type: Number,
        default: 0
    },
    pointsLost: {
        type: Number,
        default: 0
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Prevent self-duels
duelSchema.pre('save', function (next) {
    if (this.challenger.toString() === this.opponent.toString()) {
        next(new Error('Cannot challenge yourself to a duel'));
    }
    next();
});

// Prevent duplicate pending duels between the same students
duelSchema.index({ challenger: 1, opponent: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: { status: 'pending' }
});

// Add indexes
duelSchema.index({ challenger: 1, status: 1 });
duelSchema.index({ opponent: 1, status: 1 });

module.exports = mongoose.model('Duel', duelSchema); 