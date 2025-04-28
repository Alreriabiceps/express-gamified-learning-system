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
            answers,
            pointsGain
        } = req.body;

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
            pointsEarned: pointsGain
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
                totalPoints: pointsGain,
                weeklyPoints: pointsGain,
                monthlyPoints: pointsGain
            });
        } else {
            leaderboardEntry.totalPoints += pointsGain;
            leaderboardEntry.weeklyPoints += pointsGain;
            leaderboardEntry.monthlyPoints += pointsGain;
        }

        await leaderboardEntry.save();

        res.status(201).json({
            success: true,
            data: {
                testResult,
                pointsEarned: pointsGain,
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