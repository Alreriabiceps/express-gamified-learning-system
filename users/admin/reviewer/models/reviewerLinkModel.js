const mongoose = require('mongoose');

const reviewerLinkSchema = new mongoose.Schema({
  link: { type: String, required: true },
  fileType: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  subject: { type: String, required: false },
  subjects: [{ type: String }],
  tags: [{ type: String }],
  downloadCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

reviewerLinkSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ReviewerLink', reviewerLinkSchema); 