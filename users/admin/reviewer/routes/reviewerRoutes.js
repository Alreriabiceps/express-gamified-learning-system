const express = require('express');
const router = express.Router();
const reviewerController = require('../controllers/reviewerController');
const { verifyToken } = require('../../../../auth/authMiddleware');

// Get all reviewers
router.get('/', verifyToken, reviewerController.getAllReviewers);

// Add a new reviewer
router.post('/', verifyToken, reviewerController.addReviewer);

// Delete a reviewer
router.delete('/:id', verifyToken, reviewerController.deleteReviewer);

module.exports = router; 