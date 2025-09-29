const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Check if model already exists to prevent OverwriteModelError
if (mongoose.models.PendingStudent) {
  module.exports = mongoose.models.PendingStudent;
} else {
  const pendingStudentSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    middleName: String,
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    studentId: { type: Number, required: true, unique: true },
    password: { 
      type: String, 
      required: true,
      minlength: 8,
      validate: {
        validator: function(v) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v);
        },
        message: 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character'
      }
    },
    track: { type: String, required: true, enum: ['Academic Track', 'Technical-Professional Track'] },
    section: String,
    yearLevel: { type: String, required: true, enum: ['Grade 11', 'Grade 12'] },
    confirmationToken: { type: String, required: true },
    confirmationExpires: { type: Date, required: true }
  }, { timestamps: true });

  // Hash password before saving
  pendingStudentSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      console.error('Password hashing error:', error);
      next(error);
    }
  });

  module.exports = mongoose.model('PendingStudent', pendingStudentSchema);
} 