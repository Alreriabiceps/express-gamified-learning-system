const Reviewer = require('../models/Reviewer');

// Get all reviewers
const getAllReviewers = async (req, res) => {
  try {
    const reviewers = await Reviewer.find().sort({ createdAt: -1 });
    res.json(reviewers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Add a new reviewer
const addReviewer = async (req, res) => {
  try {
    const { name, link, type, subject, description } = req.body;

    // Validate required fields
    if (!name || !link || !type || !subject || !description) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Create new reviewer
    const reviewer = new Reviewer({
      name,
      link,
      type,
      subject,
      description
    });

    await reviewer.save();
    res.status(201).json(reviewer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete a reviewer
const deleteReviewer = async (req, res) => {
  try {
    const reviewer = await Reviewer.findById(req.params.id);
    
    if (!reviewer) {
      return res.status(404).json({ message: 'Reviewer not found' });
    }

    await reviewer.deleteOne();
    res.json({ message: 'Reviewer removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getAllReviewers,
  addReviewer,
  deleteReviewer
}; 