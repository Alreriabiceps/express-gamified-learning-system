const mongoose = require('mongoose');

const pendingStudentSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: String,
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  studentId: { type: Number, required: true, unique: true },
  password: { type: String, required: true },
  track: { type: String, required: true, enum: ['Academic Track', 'Technical-Professional Track'] },
  section: String,
  yearLevel: { type: String, required: true, enum: ['Grade 11', 'Grade 12'] },
  confirmationToken: { type: String, required: true },
  confirmationExpires: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('PendingStudent', pendingStudentSchema); 