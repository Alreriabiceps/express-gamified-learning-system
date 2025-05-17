const TestResult = require('../models/testResultModel');
const Leaderboard = require('../../leaderboard/models/leaderboardModel');
const Question = require('../../../admin/question/models/questionModels');
const Student = require('../../../admin/student/models/studentModels');
const Subject = require('../../../admin/subject/models/subjectModel');
const WeekSchedule = require('../../../admin/week/models/weekModel');

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

// Get all test results for a specific student
const getTestResultsForStudent = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        if (!studentId) {
            return res.status(400).json({ success: false, error: 'Student ID is required' });
        }
        const results = await TestResult.find({ studentId: studentId })
            .populate({ path: 'subjectId', model: Subject, select: 'subject' })
            .populate({ 
                path: 'weekScheduleId', 
                model: WeekSchedule, 
                select: 'weekNumber year subjectId title',
                populate: { path: 'subjectId', model: Subject, select: 'subject' }
            })
            // answers.questionId is populated directly in the map for now
            .sort({ completedAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                results: await Promise.all(results.map(async (result) => {
                    const populatedAnswers = await Promise.all(result.answers.map(async (ans) => {
                        const questionDetails = await Question.findById(ans.questionId).select('questionText choices correctAnswer bloomsLevel').lean();
                        return {
                            questionId: ans.questionId,
                            questionText: questionDetails?.questionText,
                            choices: questionDetails?.choices,
                            correctAnswer: questionDetails?.correctAnswer,
                            selectedAnswer: ans.selectedAnswer,
                            isCorrect: ans.isCorrect,
                            bloomsLevel: questionDetails?.bloomsLevel
                        };
                    }));
                    return {
                        id: result._id,
                        studentId: result.studentId,
                        weekScheduleId: result.weekScheduleId?._id,
                        subject: result.subjectId?.subject,
                        weekNumber: result.weekScheduleId?.weekNumber,
                        year: result.weekScheduleId?.year,
                        title: result.weekScheduleId?.title || `${result.subjectId?.subject || 'Test'} - Week ${result.weekScheduleId?.weekNumber || ''}`,
                        score: result.score,
                        totalQuestions: result.totalQuestions,
                        answers: populatedAnswers,
                        pointsEarned: result.pointsEarned,
                        completedAt: result.completedAt
                    };
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching test results for student:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch test results' });
    }
};

// Get details of a specific test result by its ID
const getTestResultDetailsById = async (req, res) => {
    try {
        const resultId = req.params.id;
        const testResult = await TestResult.findById(resultId)
            .populate({ path: 'studentId', model: Student, select: 'firstName lastName studentId' })
            .populate({ path: 'subjectId', model: Subject, select: 'subject' })
            .populate({
                path: 'weekScheduleId',
                model: WeekSchedule,
                select: 'weekNumber year subjectId title',
                populate: { path: 'subjectId', model: Subject, select: 'subject' }
            });
            // answers.questionId will be populated in the map

        if (!testResult) {
            return res.status(404).json({ success: false, message: 'Test result not found' });
        }
        
        const populatedAnswers = await Promise.all(testResult.answers.map(async (ans) => {
            const questionDetails = await Question.findById(ans.questionId).select('questionText choices correctAnswer bloomsLevel').lean();
            return {
                questionId: ans.questionId,
                questionText: questionDetails?.questionText,
                choices: questionDetails?.choices,
                correctAnswer: questionDetails?.correctAnswer,
                selectedAnswer: ans.selectedAnswer,
                isCorrect: ans.isCorrect,
                bloomsLevel: questionDetails?.bloomsLevel
            };
        }));

        const responseData = {
            id: testResult._id,
            title: testResult.weekScheduleId?.title || `${testResult.subjectId?.subject || 'Test'} - Week ${testResult.weekScheduleId?.weekNumber || ''}`,
            subject: testResult.subjectId?.subject,
            student: { 
                id: testResult.studentId?._id,
                name: `${testResult.studentId?.firstName || ''} ${testResult.studentId?.lastName || ''}`.trim(),
                studentIdentifier: testResult.studentId?.studentId
            },
            score: testResult.score,
            totalQuestions: testResult.totalQuestions,
            pointsEarned: testResult.pointsEarned,
            completedAt: testResult.completedAt,
            answers: populatedAnswers
        };
        res.status(200).json({ success: true, data: responseData });
    } catch (error) {
        console.error('Error fetching test result details:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch test result details' });
    }
};

module.exports = {
    saveTestResult,
    getTestResultsForStudent,
    getTestResultDetailsById
}; 