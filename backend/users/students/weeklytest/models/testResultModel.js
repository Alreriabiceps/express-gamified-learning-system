const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    weekScheduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WeekSchedule',
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    weekNumber: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    answers: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question',
            required: true
        },
        selectedAnswer: {
            type: String,
            required: true
        },
        isCorrect: {
            type: Boolean,
            required: true
        }
    }],
    pointsEarned: {
        type: Number,
        required: true
    },
    completedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Add indexes
testResultSchema.index({ studentId: 1, weekScheduleId: 1 });
testResultSchema.index({ subjectId: 1, weekNumber: 1, year: 1 });

module.exports = mongoose.model('TestResult', testResultSchema); 