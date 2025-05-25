const mongoose = require('mongoose');

const studentFavoriteReviewerSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  reviewerLink: { type: mongoose.Schema.Types.ObjectId, ref: 'ReviewerLink', required: true },
  createdAt: { type: Date, default: Date.now },
});

studentFavoriteReviewerSchema.index({ student: 1, reviewerLink: 1 }, { unique: true });

module.exports = mongoose.model('StudentFavoriteReviewer', studentFavoriteReviewerSchema); 