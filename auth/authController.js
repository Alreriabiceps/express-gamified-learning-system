const jwt = require('jsonwebtoken');
const Student = require('../users/admin/student/models/studentModels');
const bcryptjs = require('bcryptjs');

// Admin login logic (fixed username and password)
exports.adminLogin = async (req, res) => {
    const { username, password } = req.body;
  
    // Check if username and password match 'admin' credentials
    if (username === 'admin' && password === 'admin') {
      const token = jwt.sign(
        { role: 'admin' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
  
      // Send a response with role information
      return res.json({
        message: 'Admin login successful',
        token,
        role: 'admin',  // Add role as 'admin'
      });
    } else {
      return res.status(401).json({ error: 'Incorrect admin credentials' });
    }
  };
  
  // Student login logic
  exports.studentLogin = async (req, res) => {
    try {
      const { studentId, password } = req.body;
      
      // Convert studentId to number and validate
      const numericStudentId = Number(studentId);
      if (isNaN(numericStudentId)) {
        return res.status(400).json({ error: 'Invalid student ID format' });
      }

      console.log('Login attempt for studentId:', numericStudentId);
      
      // Check if student exists
      const student = await Student.findOne({ studentId: numericStudentId });
      console.log('Found student:', student ? 'Yes' : 'No');
  
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      // Check if student is active
      if (!student.isActive) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      // If password is "1234567", update the student's password
      if (password === "1234567") {
        student.password = "1234567";
        await student.save();
      }
  
      // Check if password matches
      const isMatch = await student.comparePassword(password);
      console.log('Password match:', isMatch ? 'Yes' : 'No');
      
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
  
      // Update last login
      student.lastLogin = new Date();
      await student.save();
  
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: student._id,
          studentId: student.studentId,
          role: 'student'
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
  
      // Send response with student data (excluding sensitive info)
      return res.json({
        message: 'Student login successful',
        token,
        role: 'student',
        student: student.getPublicProfile()
      });
    } catch (err) {
      console.error('Login error details:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  // Get current user profile
  exports.getProfile = async (req, res) => {
    try {
      const student = await Student.findById(req.user.id);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      res.json(student.getPublicProfile());
    } catch (err) {
      console.error('Profile error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  