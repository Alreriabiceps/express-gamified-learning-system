const jwt = require('jsonwebtoken');
const Student = require('../users/admin/student/models/studentModels');
const Admin = require('../users/admin/models/adminModel');
const bcryptjs = require('bcryptjs');

// Admin login logic
const adminLogin = async (req, res) => {
  try {
    console.log('Admin login request received');
    console.log('Request body:', req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      console.log('Missing credentials:', { username: !!username, password: !!password });
      return res.status(400).json({ error: 'Username and password are required' });
    }

    console.log('Login attempt for username:', username);

    // Check if admin exists
    const admin = await Admin.findOne({ username });
    console.log('Found admin:', admin ? 'Yes' : 'No');

    if (!admin) {
      console.log('Admin not found for username:', username);
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Check if admin is active
    if (!admin.isActive) {
      console.log('Admin account is deactivated:', username);
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Check if password matches
    const isMatch = await admin.comparePassword(password);
    console.log('Password match:', isMatch ? 'Yes' : 'No');

    if (!isMatch) {
      console.log('Incorrect password for admin:', username);
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
        role: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Prepare admin data for response
    const adminData = {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: 'admin',
      isActive: admin.isActive,
      lastLogin: admin.lastLogin
    };

    console.log('Login successful for admin:', username);

    // Send response
    return res.status(200).json({
      message: 'Admin login successful',
      token,
      admin: adminData
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Student login logic
const studentLogin = async (req, res) => {
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
const getProfile = async (req, res) => {
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

// Change password for admin
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user.id;

    // Find admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    console.log('Current password match:', isMatch ? 'Yes' : 'No');

    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change username for admin
const changeUsername = async (req, res) => {
  try {
    const { currentPassword, newUsername } = req.body;
    const adminId = req.user.id;

    // Find admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check if new username already exists
    const existingAdmin = await Admin.findOne({ username: newUsername });
    if (existingAdmin) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Update username
    admin.username = newUsername;
    await admin.save();

    res.json({ message: 'Username updated successfully' });
  } catch (err) {
    console.error('Change username error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const user = req.user;
    const newToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.status(200).json({ token: newToken });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

// Export all controller functions
module.exports = {
  adminLogin,
  studentLogin,
  getProfile,
  changePassword,
  changeUsername,
  refreshToken
};
