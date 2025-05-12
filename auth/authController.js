const jwt = require('jsonwebtoken');
const Student = require('../users/admin/student/models/studentModels');
const Admin = require('../users/admin/models/adminModel');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const PendingStudent = require('../users/admin/student/models/pendingStudentModel');
const bcrypt = require('bcryptjs');

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

// Email sending utility
const sendConfirmationEmail = async (to, token, studentDetails = {}) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // Use BACKEND_URL from environment, fallback to localhost for local dev
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const confirmUrl = `${baseUrl}/api/auth/confirm-email?token=${token}`;

  const { firstName, lastName, studentId, track, section, yearLevel } = studentDetails;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'Confirm your email for GLEAS Registration',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; padding: 32px; border-radius: 8px; max-width: 480px; margin: auto; color: #222;">
        <h2 style="color: #00b894;">Welcome to GLEAS!</h2>
        <p>Hi${firstName ? ` <b>${firstName}</b>` : ''},</p>
        <p>Thank you for registering for the GLEAS platform. Please confirm your email address to activate your account.</p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${confirmUrl}" style="background: #00b894; color: #fff; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 1.1em; display: inline-block;">Confirm Email</a>
        </div>
        <div style="background: #fff; border-radius: 6px; padding: 16px; margin: 18px 0; border: 1px solid #e0e0e0;">
          <h4 style="margin: 0 0 8px 0; color: #636e72;">Registration Details</h4>
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.98em;">
            <li><b>Name:</b> ${firstName || ''} ${lastName || ''}</li>
            <li><b>Student ID:</b> ${studentId || ''}</li>
            <li><b>Track:</b> ${track || ''}</li>
            <li><b>Section:</b> ${section || ''}</li>
            <li><b>Year Level:</b> ${yearLevel || ''}</li>
            <li><b>Email:</b> ${to}</li>
          </ul>
        </div>
        <p style="font-size: 0.97em; color: #636e72;">If you did not register for GLEAS, you can ignore this email.</p>
        <p style="font-size: 0.97em; color: #636e72;">If you don't see the email in your inbox, please check your <b>Spam</b> or <b>Promotions</b> folder.</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e0e0e0;" />
        <p style="font-size: 0.95em; color: #b2bec3;">&copy; ${new Date().getFullYear()} GLEAS. All rights reserved.</p>
      </div>
    `
  });
};

// Student registration logic
const studentRegister = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      studentId,
      password,
      track,
      section,
      yearLevel
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !studentId || !password || !track || !section || !yearLevel) {
      return res.status(400).json({ error: 'All required fields must be filled.' });
    }

    // Check if studentId or email already exists in Student or PendingStudent
    const existingStudent = await Student.findOne({ $or: [ { studentId }, { email } ] });
    const existingPending = await PendingStudent.findOne({ $or: [ { studentId }, { email } ] });
    if (existingStudent || existingPending) {
      return res.status(409).json({ error: 'Student ID or email already exists.' });
    }

    // Generate confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const confirmationExpires = Date.now() + 1000 * 60 * 60 * 24; // 24 hours

    // Save to PendingStudent
    const pendingStudent = new PendingStudent({
      firstName,
      middleName,
      lastName,
      email,
      studentId,
      password,
      track,
      section,
      yearLevel,
      confirmationToken,
      confirmationExpires
    });
    await pendingStudent.save();

    // Send confirmation email
    await sendConfirmationEmail(email, confirmationToken, {
      firstName,
      lastName,
      studentId,
      track,
      section,
      yearLevel
    });

    res.status(201).json({
      success: true,
      message: 'Registration started! Please check your email to confirm your account.'
    });
  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({ error: 'Error registering student', details: error.message });
  }
};

// Email confirmation endpoint
const confirmEmail = async (req, res) => {
  try {
    const { token } = req.query;
    // Always redirect to frontend, regardless of token validity
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/registration-success?token=${token}`);
  } catch (error) {
    // On error, also redirect to frontend
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/registration-success?token=${req.query.token || ''}`);
  }
};

// Finalize registration endpoint
const finalizeRegistration = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'No token provided.' });
    }
    const pending = await PendingStudent.findOne({ confirmationToken: token, confirmationExpires: { $gt: Date.now() } });
    if (!pending) {
      // Try to find the student in the database (already finalized)
      const student = await Student.findOne({
        $or: [
          { email: req.query.email },
          { studentId: req.query.studentId }
        ]
      });
      if (student) {
        return res.json({ success: true, student: student.getPublicProfile() });
      }
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }
    // Hash the password before saving to Student
    const hashedPassword = await bcrypt.hash(pending.password, 10);
    const student = new Student({
      firstName: pending.firstName,
      middleName: pending.middleName,
      lastName: pending.lastName,
      email: pending.email,
      studentId: pending.studentId,
      password: hashedPassword,
      track: pending.track,
      section: pending.section,
      yearLevel: pending.yearLevel,
      isEmailConfirmed: true
    });
    await student.save();
    await PendingStudent.deleteOne({ _id: pending._id });
    res.json({ success: true, student: student.getPublicProfile() });
  } catch (error) {
    console.error('Finalize registration error:', error);
    res.status(500).json({ error: 'Error finalizing registration', details: error.message });
  }
};

// Export all controller functions
module.exports = {
  adminLogin,
  studentLogin,
  getProfile,
  changePassword,
  changeUsername,
  refreshToken,
  studentRegister,
  confirmEmail,
  finalizeRegistration
};
