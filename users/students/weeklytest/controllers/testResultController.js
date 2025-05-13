const TestResult = require('../models/testResultModel');
const Leaderboard = require('../../leaderboard/models/leaderboardModel');

// Save test result
const saveTestResult = async (req, res) => {
    try {
        const {
            studentId,
            weekScheduleId,
            subjectId,
            weekNumber,
            year,
            score,
            totalQuestions,
            answers
        } = req.body;

        // Calculate points on backend
        const percentage = (score / totalQuestions) * 100;
        let pointsEarned;
        if (percentage >= 90) {
            pointsEarned = 30;
        } else if (percentage >= 70) {
            pointsEarned = 20;
        } else if (percentage >= 50) {
            pointsEarned = 10;
        } else {
            pointsEarned = -10;
        }

        // Check if test was already completed
        const existingResult = await TestResult.findOne({
            studentId,
            weekScheduleId
        });

        if (existingResult) {
            return res.status(400).json({
                success: false,
                message: 'You have already completed this test'
            });
        }

        // Create new test result
        const testResult = new TestResult({
            studentId,
            weekScheduleId,
            subjectId,
            weekNumber,
            year,
            score,
            totalQuestions,
            answers,
            pointsEarned
        });

        await testResult.save();

        // Update leaderboard
        let leaderboardEntry = await Leaderboard.findOne({
            student: studentId,
            subject: subjectId
        });

        if (!leaderboardEntry) {
            leaderboardEntry = new Leaderboard({
                student: studentId,
                subject: subjectId,
                totalPoints: pointsEarned,
                weeklyPoints: pointsEarned,
                monthlyPoints: pointsEarned
            });
        } else {
            leaderboardEntry.totalPoints += pointsEarned;
            leaderboardEntry.weeklyPoints += pointsEarned;
            leaderboardEntry.monthlyPoints += pointsEarned;
        }

        await leaderboardEntry.save();

        res.status(201).json({
            success: true,
            data: {
                testResult,
                pointsEarned,
                totalPoints: leaderboardEntry.totalPoints
            }
        });
    } catch (error) {
        console.error('Error saving test result:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    saveTestResult
}; 