const express = require('express');
const router = express.Router();
const StudentFavoriteReviewer = require('../models/studentFavoriteReviewerModel');
const { verifyToken, isStudent } = require('../../../../auth/authMiddleware');

// Add favorite
router.post('/', verifyToken, isStudent, async (req, res) => {
  try {
    const { reviewerLink } = req.body;
    const student = req.user.id;
    const favorite = new StudentFavoriteReviewer({ student, reviewerLink });
    await favorite.save();
    res.status(201).json(favorite);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Already favorited' });
    }
    res.status(400).json({ error: error.message });
  }
});

// Remove favorite
router.delete('/:id', verifyToken, isStudent, async (req, res) => {
  try {
    const student = req.user.id;
    const { id } = req.params;
    const result = await StudentFavoriteReviewer.findOneAndDelete({ student, reviewerLink: id });
    if (!result) return res.status(404).json({ error: 'Favorite not found' });
    res.json({ message: 'Favorite removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all favorites for current student
router.get('/', verifyToken, isStudent, async (req, res) => {
  try {
    const student = req.user.id;
    const favorites = await StudentFavoriteReviewer.find({ student }).populate('reviewerLink');
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 