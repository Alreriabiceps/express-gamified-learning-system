const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    totalPoints: {
        type: Number,
        default: 0
    },
    weeklyPoints: {
        type: Number,
        default: 0
    },
    monthlyPoints: {
        type: Number,
        default: 0
    },
    rank: {
        type: Number
    },
    weeklyRank: {
        type: Number
    },
    monthlyRank: {
        type: Number
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Add indexes
leaderboardSchema.index({ subject: 1, totalPoints: -1 });
leaderboardSchema.index({ subject: 1, weeklyPoints: -1 });
leaderboardSchema.index({ subject: 1, monthlyPoints: -1 });

module.exports = mongoose.model('Leaderboard', leaderboardSchema); 