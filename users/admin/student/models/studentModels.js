const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: String,
  lastName: { type: String, required: true },
  age: { type: Number, required: true },
  studentId: { 
    type: Number, 
    required: true, 
    unique: true,
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'Student ID must be a positive number'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  strand: String,
  section: String,
  yearLevel: { 
    type: String, 
    required: true, 
    enum: ['Grade 11', 'Grade 12'],  // Only Grade 11 or 12 allowed
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Add pre-save middleware to log student creation/updates
studentSchema.pre('save', function(next) {
  console.log('Saving student:', {
    studentId: this.studentId,
    isNew: this.isNew,
    modifiedFields: this.modifiedPaths()
  });
  next();
});

// Hash password before saving
studentSchema.pre('save', async function(next) {
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

// Method to compare password
studentSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    throw error;
  }
};

// Method to get public profile (without sensitive data)
studentSchema.methods.getPublicProfile = function() {
  const studentObject = this.toObject({ getters: true });
  delete studentObject.password;
  return {
    id: studentObject._id,
    studentId: studentObject.studentId,
    firstName: studentObject.firstName,
    middleName: studentObject.middleName,
    lastName: studentObject.lastName,
    age: studentObject.age,
    strand: studentObject.strand,
    section: studentObject.section,
    yearLevel: studentObject.yearLevel,
    isActive: studentObject.isActive,
    lastLogin: studentObject.lastLogin,
    createdAt: studentObject.createdAt,
    updatedAt: studentObject.updatedAt,
    role: "student"
  };
};

// Ensure unique studentId and index
studentSchema.index({ studentId: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
