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
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; padding: 32px; border-radius: 12px; max-width: 480px; margin: auto; color: #222; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <h2 style="color: #00b894; margin-bottom: 0.5em;">Welcome to <span style='color:#4a1a5c;'>GLEAS</span>!</h2>
        <p style="font-size: 1.1em; margin-bottom: 1.2em;">Hi${firstName ? ` <b>${firstName}</b>` : ''},</p>
        <p style="margin-bottom: 1.2em;">Thank you for registering for the <b>GLEAS</b> platform. We're excited to have you join our learning community!</p>
        <div style="background: #fff; border-radius: 8px; padding: 18px; margin: 18px 0; border: 1px solid #e0e0e0;">
          <h4 style="margin: 0 0 10px 0; color: #636e72;">Your Registration Details</h4>
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 1em;">
            <li><b>Name:</b> ${firstName || ''} ${lastName || ''}</li>
            <li><b>Student ID:</b> ${studentId || ''}</li>
            <li><b>Track:</b> ${track || ''}</li>
            <li><b>Section:</b> ${section || ''}</li>
            <li><b>Year Level:</b> ${yearLevel || ''}</li>
            <li><b>Email:</b> ${to}</li>
          </ul>
        </div>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${confirmUrl}" style="background: linear-gradient(90deg,#00b894,#4a1a5c); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 1.1em; display: inline-block; box-shadow: 0 2px 8px #00b89433; letter-spacing: 1px;">Confirm Email</a>
        </div>
        <div style="background: #f1f8f6; border-radius: 8px; padding: 16px; margin: 18px 0; border: 1px solid #d0f5e8;">
          <h4 style="margin: 0 0 8px 0; color: #00b894;">What's Next?</h4>
          <ol style="padding-left: 1.2em; margin: 0; font-size: 0.98em; color: #222;">
            <li>Click the <b>Confirm Email</b> button above.</li>
            <li>Once confirmed, you can <b>log in</b> to your GLEAS account.</li>
            <li>Start exploring courses, earning points, and enjoying your learning journey!</li>
          </ol>
        </div>
        <p style="font-size: 1em; color: #636e72; margin-top: 1.5em;">If you don't see the email in your inbox, please check your <b>Spam</b> or <b>Promotions</b> folder.</p>
        <p style="font-size: 0.97em; color: #636e72;">If you did not register for GLEAS, you can ignore this email.</p>
        <hr style="margin: 28px 0; border: none; border-top: 1px solid #e0e0e0;" />
        <p style="font-size: 0.95em; color: #b2bec3; text-align: center;">&copy; ${new Date().getFullYear()} GLEAS. All rights reserved.</p>
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
    // Use FRONTEND_URL, fallback to CLIENT_URL, then localhost
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    // Always redirect to frontend, regardless of token validity
    res.redirect(`${frontendUrl}/registration-success?token=${token}`);
  } catch (error) {
    // On error, also redirect to frontend
    const fallbackUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${fallbackUrl}/registration-success?token=${req.query.token || ''}`);
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
    // Password is already hashed in PendingStudent, do NOT hash again
    const student = new Student({
      firstName: pending.firstName,
      middleName: pending.middleName,
      lastName: pending.lastName,
      email: pending.email,
      studentId: pending.studentId,
      password: pending.password, // already hashed
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

// Request password reset
const requestPasswordReset = async (req, res) => {
  try {
    const { email, studentId } = req.body;
    let student;
    if (email) {
      student = await Student.findOne({ email });
    } else if (studentId) {
      student = await Student.findOne({ studentId });
    }
    if (!student) {
      return res.status(404).json({ error: 'No student found with that email or ID.' });
    }
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    student.resetPasswordToken = token;
    student.resetPasswordExpires = Date.now() + 1000 * 60 * 30; // 30 minutes
    await student.save();
    // Send email
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    await sendPasswordResetEmail(student.email, resetUrl, student.firstName);
    res.json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ error: 'Error requesting password reset', details: error.message });
  }
};

// Send password reset email
const sendPasswordResetEmail = async (to, resetUrl, firstName) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'GLEAS Password Reset Request',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; padding: 32px; border-radius: 12px; max-width: 480px; margin: auto; color: #222; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <h2 style="color: #00b894; margin-bottom: 0.5em;">GLEAS Password Reset</h2>
        <p style="font-size: 1.1em; margin-bottom: 1.2em;">Hi${firstName ? ` <b>${firstName}</b>` : ''},</p>
        <p style="margin-bottom: 1.2em;">We received a request to reset your password. Click the button below to set a new password. This link will expire in 30 minutes.</p>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${resetUrl}" style="background: linear-gradient(90deg,#00b894,#4a1a5c); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 1.1em; display: inline-block; box-shadow: 0 2px 8px #00b89433; letter-spacing: 1px;">Reset Password</a>
        </div>
        <p style="font-size: 0.97em; color: #636e72;">If you did not request this, you can ignore this email.</p>
        <hr style="margin: 28px 0; border: none; border-top: 1px solid #e0e0e0;" />
        <p style="font-size: 0.95em; color: #b2bec3; text-align: center;">&copy; ${new Date().getFullYear()} GLEAS. All rights reserved.</p>
      </div>
    `
  });
};

// Reset password using token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const student = await Student.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!student) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }
    student.password = newPassword;
    student.resetPasswordToken = undefined;
    student.resetPasswordExpires = undefined;
    await student.save();
    res.json({ success: true, message: 'Password has been reset. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Error resetting password', details: error.message });
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
  finalizeRegistration,
  requestPasswordReset,
  resetPassword
};
