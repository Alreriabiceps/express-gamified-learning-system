const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: String,
  lastName: { type: String, required: true },
  age: { type: Number, required: true },
  studentId: { 
    type: Number, 
    required: true, 
    unique: true, // Ensures the studentId is unique in the database
  },
  strand: String,
  section: String,
  yearLevel: { 
    type: String, 
    required: true, 
    enum: ['Grade 11', 'Grade 12'],  // Only Grade 11 or 12 allowed
  }
});

// Ensure unique studentId and index
studentSchema.index({ studentId: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
