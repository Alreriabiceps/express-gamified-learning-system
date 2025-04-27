const Leaderboard = require('../models/leaderboardModel');
const Student = require('../../../../users/admin/student/models/studentModels');

// Get leaderboard by subject
exports.getLeaderboardBySubject = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const { timeFrame = 'total' } = req.query;

        let sortField;
        switch (timeFrame) {
            case 'weekly':
                sortField = 'weeklyPoints';
                break;
            case 'monthly':
                sortField = 'monthlyPoints';
                break;
            default:
                sortField = 'totalPoints';
        }

        const leaderboard = await Leaderboard.find({ subject: subjectId })
            .populate('student', 'firstName lastName totalPoints')
            .populate('subject', 'name')
            .sort({ [sortField]: -1 })
            .limit(100);

        res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get student's rank
exports.getStudentRank = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const studentId = req.user.id;
        const { timeFrame = 'total' } = req.query;

        let sortField;
        switch (timeFrame) {
            case 'weekly':
                sortField = 'weeklyPoints';
                break;
            case 'monthly':
                sortField = 'monthlyPoints';
                break;
            default:
                sortField = 'totalPoints';
        }

        const studentRank = await Leaderboard.findOne({
            subject: subjectId,
            student: studentId
        })
            .populate('student', 'firstName lastName totalPoints')
            .populate('subject', 'name');

        if (!studentRank) {
            return res.status(404).json({
                success: false,
                message: 'Student not found in leaderboard'
            });
        }

        // Get total number of students in this subject
        const totalStudents = await Leaderboard.countDocuments({ subject: subjectId });

        res.json({
            success: true,
            data: {
                ...studentRank.toObject(),
                totalStudents
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update student points
exports.updateStudentPoints = async (req, res) => {
    try {
        const { studentId, subjectId, points } = req.body;

        let leaderboardEntry = await Leaderboard.findOne({
            student: studentId,
            subject: subjectId
        });

        if (!leaderboardEntry) {
            leaderboardEntry = new Leaderboard({
                student: studentId,
                subject: subjectId,
                totalPoints: points,
                weeklyPoints: points,
                monthlyPoints: points
            });
        } else {
            leaderboardEntry.totalPoints += points;
            leaderboardEntry.weeklyPoints += points;
            leaderboardEntry.monthlyPoints += points;
        }

        await leaderboardEntry.save();

        // Update ranks
        await updateRanks(subjectId);

        res.json({
            success: true,
            data: leaderboardEntry
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Helper function to update ranks
async function updateRanks(subjectId) {
    const leaderboard = await Leaderboard.find({ subject: subjectId })
        .sort({ totalPoints: -1 });

    for (let i = 0; i < leaderboard.length; i++) {
        leaderboard[i].rank = i + 1;
        await leaderboard[i].save();
    }

    const weeklyLeaderboard = await Leaderboard.find({ subject: subjectId })
        .sort({ weeklyPoints: -1 });

    for (let i = 0; i < weeklyLeaderboard.length; i++) {
        weeklyLeaderboard[i].weeklyRank = i + 1;
        await weeklyLeaderboard[i].save();
    }

    const monthlyLeaderboard = await Leaderboard.find({ subject: subjectId })
        .sort({ monthlyPoints: -1 });

    for (let i = 0; i < monthlyLeaderboard.length; i++) {
        monthlyLeaderboard[i].monthlyRank = i + 1;
        await monthlyLeaderboard[i].save();
    }
} 