const Duel = require('../models/duelModel');
const Student = require('../../models/studentModel');

// Challenge a student to a duel
exports.challengeDuel = async (req, res) => {
    try {
        const { opponentId, subject } = req.body;
        const challengerId = req.user.id;

        // Check if opponent exists
        const opponent = await Student.findById(opponentId);
        if (!opponent) {
            return res.status(404).json({
                success: false,
                message: 'Opponent not found'
            });
        }

        // Check if there's already a pending duel
        const existingDuel = await Duel.findOne({
            $or: [
                { challenger: challengerId, opponent: opponentId, status: 'pending' },
                { challenger: opponentId, opponent: challengerId, status: 'pending' }
            ]
        });

        if (existingDuel) {
            return res.status(400).json({
                success: false,
                message: 'There is already a pending duel between these players'
            });
        }

        const duel = new Duel({
            challenger: challengerId,
            opponent: opponentId,
            subject
        });

        await duel.save();
        await duel.populate('challenger opponent', 'firstName lastName totalPoints');

        res.status(201).json({
            success: true,
            data: duel
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Accept a duel challenge
exports.acceptDuel = async (req, res) => {
    try {
        const { duelId } = req.params;
        const opponentId = req.user.id;

        const duel = await Duel.findById(duelId);
        if (!duel) {
            return res.status(404).json({
                success: false,
                message: 'Duel not found'
            });
        }

        if (duel.opponent.toString() !== opponentId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to accept this duel'
            });
        }

        if (duel.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Duel is not in pending status'
            });
        }

        duel.status = 'accepted';
        await duel.save();
        await duel.populate('challenger opponent', 'firstName lastName totalPoints');

        res.json({
            success: true,
            data: duel
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Reject a duel challenge
exports.rejectDuel = async (req, res) => {
    try {
        const { duelId } = req.params;
        const opponentId = req.user.id;

        const duel = await Duel.findById(duelId);
        if (!duel) {
            return res.status(404).json({
                success: false,
                message: 'Duel not found'
            });
        }

        if (duel.opponent.toString() !== opponentId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to reject this duel'
            });
        }

        if (duel.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Duel is not in pending status'
            });
        }

        duel.status = 'rejected';
        await duel.save();

        res.json({
            success: true,
            message: 'Duel rejected successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all duels for a student
exports.getStudentDuels = async (req, res) => {
    try {
        const studentId = req.user.id;

        const duels = await Duel.find({
            $or: [
                { challenger: studentId },
                { opponent: studentId }
            ]
        })
            .populate('challenger opponent', 'firstName lastName totalPoints')
            .populate('subject', 'name')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: duels
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 