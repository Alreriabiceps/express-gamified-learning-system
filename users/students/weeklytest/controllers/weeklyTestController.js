const WeeklyTest = require('../models/weeklyTestModel');

// Create a new weekly test
const createWeeklyTest = async (req, res) => {
    try {
        const {
            title,
            subject,
            questions,
            startDate,
            endDate,
            duration,
            totalPoints
        } = req.body;

        const adminId = req.user.id;

        const weeklyTest = new WeeklyTest({
            title,
            subject,
            questions,
            startDate,
            endDate,
            duration,
            totalPoints,
            createdBy: adminId
        });

        await weeklyTest.save();
        await weeklyTest.populate('subject', 'name');
        await weeklyTest.populate('createdBy', 'firstName lastName');

        res.status(201).json({
            success: true,
            data: weeklyTest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all weekly tests
const getAllWeeklyTests = async (req, res) => {
    try {
        const weeklyTests = await WeeklyTest.find()
            .populate('subject', 'name')
            .populate('createdBy', 'firstName lastName')
            .sort({ startDate: -1 });

        res.json({
            success: true,
            data: weeklyTests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get weekly tests by subject
const getWeeklyTestsBySubject = async (req, res) => {
    try {
        const { subjectId } = req.params;

        const weeklyTests = await WeeklyTest.find({ subject: subjectId })
            .populate('subject', 'name')
            .populate('createdBy', 'firstName lastName')
            .sort({ startDate: -1 });

        res.json({
            success: true,
            data: weeklyTests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update weekly test status
const updateWeeklyTestStatus = async (req, res) => {
    try {
        const { testId } = req.params;
        const { status } = req.body;

        const weeklyTest = await WeeklyTest.findById(testId);
        if (!weeklyTest) {
            return res.status(404).json({
                success: false,
                message: 'Weekly test not found'
            });
        }

        weeklyTest.status = status;
        await weeklyTest.save();

        res.json({
            success: true,
            data: weeklyTest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get test results by student ID
const getTestResultsByStudent = async (req, res) => {
    try {
        const studentId = req.params.studentId || req.query.studentId;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                error: 'Student ID is required'
            });
        }

        // Find all test results for the student
        const results = await WeeklyTest.find({ studentId })
            .populate('subjectId', 'subject')
            .populate('weekScheduleId', 'weekNumber year')
            .sort({ completedAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                results: results.map(result => ({
                    id: result._id,
                    subject: result.subjectId.subject,
                    weekNumber: result.weekScheduleId.weekNumber,
                    year: result.weekScheduleId.year,
                    score: result.score,
                    totalQuestions: result.totalQuestions,
                    completedAt: result.completedAt
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching test results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test results'
        });
    }
};

// Get test statistics by test result ID
const getTestStatistics = async (req, res) => {
    try {
        const { id } = req.params;

        const testResult = await WeeklyTest.findById(id)
            .populate('subject', 'name')
            .populate('createdBy', 'firstName lastName');

        if (!testResult) {
            return res.status(404).json({
                success: false,
                message: 'Test result not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: testResult._id,
                title: testResult.title,
                subject: testResult.subject.name,
                score: testResult.score || 0,
                totalPoints: testResult.totalPoints,
                completedAt: testResult.updatedAt,
                questions: testResult.questions.map(q => ({
                    id: q._id,
                    question: q.question,
                    correctAnswer: q.correctAnswer,
                    studentAnswer: q.studentAnswer,
                    isCorrect: q.isCorrect
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching test statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test statistics'
        });
    }
};

module.exports = {
    createWeeklyTest,
    getAllWeeklyTests,
    getWeeklyTestsBySubject,
    updateWeeklyTestStatus,
    getTestResultsByStudent,
    getTestStatistics
}; 