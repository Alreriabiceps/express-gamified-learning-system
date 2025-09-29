const ReviewerLink = require('../models/reviewerLinkModel');

// Create a new reviewer link
exports.createReviewerLink = async (req, res) => {
  try {
    const { link, fileType, title, description, subject } = req.body;
    const reviewerLink = new ReviewerLink({ link, fileType, title, description, subject });
    await reviewerLink.save();
    res.status(201).json(reviewerLink);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all reviewer links
exports.getReviewerLinks = async (req, res) => {
  try {
    const reviewerLinks = await ReviewerLink.find().sort({ createdAt: -1 });
    res.json(reviewerLinks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single reviewer link by ID
exports.getReviewerLinkById = async (req, res) => {
  try {
    const reviewerLink = await ReviewerLink.findById(req.params.id);
    if (!reviewerLink) return res.status(404).json({ error: 'Reviewer link not found' });
    res.json(reviewerLink);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a reviewer link
exports.updateReviewerLink = async (req, res) => {
  try {
    const { link, fileType, title, description, subject } = req.body;
    const reviewerLink = await ReviewerLink.findByIdAndUpdate(
      req.params.id,
      { link, fileType, title, description, subject },
      { new: true, runValidators: true }
    );
    if (!reviewerLink) return res.status(404).json({ error: 'Reviewer link not found' });
    res.json(reviewerLink);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a reviewer link
exports.deleteReviewerLink = async (req, res) => {
  try {
    const reviewerLink = await ReviewerLink.findByIdAndDelete(req.params.id);
    if (!reviewerLink) return res.status(404).json({ error: 'Reviewer link not found' });
    res.json({ message: 'Reviewer link deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Increment download count
exports.incrementDownloadCount = async (req, res) => {
  try {
    const reviewerLink = await ReviewerLink.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    );
    if (!reviewerLink) return res.status(404).json({ error: 'Reviewer link not found' });
    res.json({ downloadCount: reviewerLink.downloadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; 