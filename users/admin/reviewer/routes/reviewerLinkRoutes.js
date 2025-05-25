const express = require('express');
const router = express.Router();
const reviewerLinkController = require('../controllers/reviewerLinkController');

// Create a reviewer link
router.post('/', reviewerLinkController.createReviewerLink);
// Get all reviewer links
router.get('/', reviewerLinkController.getReviewerLinks);
// Get a reviewer link by ID
router.get('/:id', reviewerLinkController.getReviewerLinkById);
// Update a reviewer link
router.put('/:id', reviewerLinkController.updateReviewerLink);
// Delete a reviewer link
router.delete('/:id', reviewerLinkController.deleteReviewerLink);
// Increment download count
router.post('/:id/increment-download', reviewerLinkController.incrementDownloadCount);

module.exports = router; 