const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: String,
  lastName: { type: String, required: true },
  age: { type: Number, required: true },
  studentId: { type: String, required: true, unique: true },
  strand: String,
  section: String,
  yearLevel: String
});

module.exports = mongoose.model('Student', studentSchema);
