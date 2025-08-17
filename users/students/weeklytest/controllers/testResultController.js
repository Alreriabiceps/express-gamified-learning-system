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
        }).populate('weekScheduleId').populate('subjectId');

        if (existingResult) {
            // Get updated leaderboard points
            const leaderboardEntry = await Leaderboard.findOne({
                student: studentId,
                subject: subjectId
            });

            return res.status(200).json({
                success: true,
                data: {
                    testResult: {
                        _id: existingResult._id,
                        score: existingResult.score,
                        totalQuestions: existingResult.totalQuestions,
                        answers: existingResult.answers,
                        completedAt: existingResult.completedAt
                    },
                    pointsEarned: existingResult.pointsEarned,
                    totalPoints: leaderboardEntry ? leaderboardEntry.totalPoints : existingResult.pointsEarned,
                    alreadyCompleted: true
                }
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

// Get study progress analytics
const getStudyProgress = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        
        // Get all test results for the student
        const testResults = await TestResult.find({ studentId })
            .populate('weekScheduleId')
            .sort({ createdAt: -1 })
            .limit(10);

        if (!testResults.length) {
            return res.json({
                success: true,
                data: {
                    overallScore: 0,
                    trend: 'neutral',
                    weeklyScores: [],
                    bloomsAnalysis: {
                        remember: 0,
                        understand: 0,
                        apply: 0,
                        analyze: 0,
                        evaluate: 0,
                        create: 0
                    },
                    strongTopics: [],
                    weakTopics: [],
                    studyTime: 0,
                    recommendation: "Complete some tests to see your progress analytics."
                }
            });
        }

        // Calculate overall score
        const totalScore = testResults.reduce((sum, result) => sum + result.score, 0);
        const totalQuestions = testResults.reduce((sum, result) => sum + result.totalQuestions, 0);
        const overallScore = Math.round((totalScore / totalQuestions) * 100);

        // Calculate trend (comparing recent vs older results)
        const recentResults = testResults.slice(0, 3);
        const olderResults = testResults.slice(3, 6);
        
        const recentAvg = recentResults.length ? 
            recentResults.reduce((sum, r) => sum + (r.score / r.totalQuestions * 100), 0) / recentResults.length : 0;
        const olderAvg = olderResults.length ? 
            olderResults.reduce((sum, r) => sum + (r.score / r.totalQuestions * 100), 0) / olderResults.length : 0;
        
        const trend = recentAvg > olderAvg + 5 ? 'improving' : 
                      recentAvg < olderAvg - 5 ? 'declining' : 'stable';

        // Weekly scores for chart
        const weeklyScores = testResults.reverse().map(result => Math.round((result.score / result.totalQuestions) * 100));

        // Mock Bloom's taxonomy analysis
        const bloomsAnalysis = {
            remember: Math.min(95, Math.round(overallScore + Math.random() * 20)),
            understand: Math.min(95, Math.round(overallScore + Math.random() * 15)),
            apply: Math.min(95, Math.round(overallScore + Math.random() * 10)),
            analyze: Math.min(95, Math.round(overallScore + Math.random() * 5)),
            evaluate: Math.min(95, Math.round(overallScore - Math.random() * 5)),
            create: Math.min(95, Math.round(overallScore - Math.random() * 15))
        };

        // Generate recommendations
        const weakestSkill = Object.entries(bloomsAnalysis).reduce((a, b) => bloomsAnalysis[a[0]] > bloomsAnalysis[b[0]] ? b : a);
        const recommendation = `Focus on ${weakestSkill[0]} skills to improve your overall understanding. Consider reviewing concepts that require ${weakestSkill[0]}.`;

        res.json({
            success: true,
            data: {
                overallScore,
                trend,
                weeklyScores: weeklyScores.slice(-7), // Last 7 scores
                bloomsAnalysis,
                strongTopics: ["Mathematics", "Science"], // Mock data
                weakTopics: ["History", "Literature"], // Mock data  
                studyTime: testResults.length * 15, // Estimated study time
                recommendation
            }
        });

    } catch (error) {
        console.error('Error fetching study progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch study progress'
        });
    }
};

// Get adaptive learning recommendations
const getAdaptiveLearning = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        
        // Get recent test results to analyze performance
        const recentResults = await TestResult.find({ studentId })
            .populate('weekScheduleId')
            .sort({ createdAt: -1 })
            .limit(5);

        if (!recentResults.length) {
            return res.json({
                success: true,
                data: {
                    currentLevel: "Beginner",
                    skillGaps: [],
                    personalizedPath: [
                        { topic: "Basic Concepts", difficulty: "Easy", estimatedTime: "30 mins" }
                    ],
                    learningStyle: "Unknown",
                    preferences: {
                        studyTime: "Any time",
                        sessionLength: "30 minutes",
                        difficulty: "Gradual increase"
                    }
                }
            });
        }

        // Analyze performance to determine skill level
        const avgScore = recentResults.reduce((sum, r) => sum + (r.score / r.totalQuestions), 0) / recentResults.length;
        const currentLevel = avgScore >= 0.8 ? "Advanced" : avgScore >= 0.6 ? "Intermediate" : "Beginner";

        // Identify skill gaps based on wrong answers
        const skillGaps = [];
        recentResults.forEach(result => {
            result.answers?.forEach(answer => {
                if (!answer.isCorrect) {
                    // Mock skill gap identification
                    skillGaps.push("Problem Solving", "Critical Thinking");
                }
            });
        });

        // Remove duplicates and limit to top gaps
        const uniqueSkillGaps = [...new Set(skillGaps)].slice(0, 3);

        // Generate personalized learning path
        const personalizedPath = [
            { topic: "Foundation Review", difficulty: "Easy", estimatedTime: "30 mins" },
            { topic: "Practice Problems", difficulty: "Medium", estimatedTime: "45 mins" },
            { topic: "Advanced Applications", difficulty: "Hard", estimatedTime: "60 mins" }
        ];

        res.json({
            success: true,
            data: {
                currentLevel,
                skillGaps: uniqueSkillGaps,
                personalizedPath,
                learningStyle: "Visual", // Mock learning style detection
                preferences: {
                    studyTime: "Evening",
                    sessionLength: "30-45 minutes", 
                    difficulty: "Gradual increase"
                }
            }
        });

    } catch (error) {
        console.error('Error fetching adaptive learning data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch adaptive learning data'
        });
    }
};

// Get spaced repetition data
const getSpacedRepetition = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        
        // Get test results to analyze concepts that need review
        const testResults = await TestResult.find({ studentId })
            .populate('weekScheduleId')
            .sort({ createdAt: -1 });

        if (!testResults.length) {
            return res.json({
                success: true,
                data: {
                    streak: 0,
                    totalReviews: 0,
                    dueToday: 0,
                    concepts: [],
                    memoryStrength: {
                        strong: 0,
                        medium: 0,
                        weak: 0
                    }
                }
            });
        }

        // Calculate streak (consecutive days with tests)
        const streak = Math.min(testResults.length, 30); // Cap at 30 for demo

        // Mock spaced repetition concepts
        const concepts = [
            { 
                name: "Quadratic Equations", 
                difficulty: 0.7, 
                nextReview: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0], 
                retention: 85 
            },
            { 
                name: "Cell Biology", 
                difficulty: 0.4, 
                nextReview: new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0], 
                retention: 92 
            },
            { 
                name: "World War History", 
                difficulty: 0.8, 
                nextReview: new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0], 
                retention: 78 
            }
        ];

        res.json({
            success: true,
            data: {
                streak,
                totalReviews: testResults.length,
                dueToday: 3, // Mock number due today
                concepts,
                memoryStrength: {
                    strong: 12,
                    medium: 8,
                    weak: 5
                }
            }
        });

    } catch (error) {
        console.error('Error fetching spaced repetition data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch spaced repetition data'
        });
    }
};

module.exports = {
    saveTestResult,
    getTestResultsForStudent,
    getTestResultDetailsById,
    getStudyProgress,
    getAdaptiveLearning,
    getSpacedRepetition
}; 