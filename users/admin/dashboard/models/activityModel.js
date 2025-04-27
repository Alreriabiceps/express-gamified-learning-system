const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    description: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    icon: {
        type: String,
        required: true
    },
    iconColor: {
        type: String,
        required: true
    },
    iconBgColor: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Add index for faster queries
activitySchema.index({ timestamp: -1 });

module.exports = mongoose.model('Activity', activitySchema); 