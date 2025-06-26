const Student = require('../../student/models/Student');
const Question = require('../../shared/models/Question');
const Subject = require('../../shared/models/Subject');
const WeekSchedule = require('../../shared/models/WeekSchedule');
const Activity = require('../models/Activity');

// Get dashboard statistics
const getStats = async (req, res) => {
    try {
        // Get counts from different collections
        const [totalStudents, totalQuestions, totalSubjects, totalWeeklyTests] = await Promise.all([
            Student.countDocuments(),
            Question.countDocuments(),
            Subject.countDocuments(),
            WeekSchedule.countDocuments()
        ]);

        res.json({
            totalStudents,
            totalQuestions,
            totalSubjects,
            totalWeeklyTests
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ error: 'Failed to get dashboard statistics' });
    }
};

// Get recent activity
const getRecentActivity = async (req, res) => {
    try {
        // Get the 10 most recent activities
        const activities = await Activity.find()
            .sort({ timestamp: -1 })
            .limit(10)
            .populate('userId', 'username');

        // Format activities for frontend
        const formattedActivities = activities.map(activity => ({
            id: activity._id,
            description: activity.description,
            timestamp: activity.timestamp,
            icon: activity.icon,
            iconColor: activity.iconColor,
            iconBgColor: activity.iconBgColor
        }));

        res.json(formattedActivities);
    } catch (error) {
        console.error('Error getting recent activity:', error);
        res.status(500).json({ error: 'Failed to get recent activity' });
    }
};

module.exports = {
    getStats,
    getRecentActivity
}; 