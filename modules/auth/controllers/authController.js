const jwt = require("jsonwebtoken");
const Student = require("../../student/models/Student");
const Admin = require("../../admin/models/Admin");
const bcryptjs = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const PendingStudent = require("../../student/models/PendingStudent");
const bcrypt = require("bcryptjs");

// Admin login logic
const adminLogin = async (req, res) => {
  try {
    console.log("Admin login request received");
    console.log("Request body:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      console.log("Missing credentials:", {
        username: !!username,
        password: !!password,
      });
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    console.log("Login attempt for username:", username);

    // Check if admin exists
    const admin = await Admin.findOne({ username });
    console.log("Found admin:", admin ? "Yes" : "No");

    if (!admin) {
      console.log("Admin not found for username:", username);
      return res.status(404).json({ error: "Admin not found" });
    }

    // Check if admin is active
    if (!admin.isActive) {
      console.log("Admin account is deactivated:", username);
      return res.status(403).json({ error: "Account is deactivated" });
    }

    // Check if password matches
    const isMatch = await admin.comparePassword(password);
    console.log("Password match:", isMatch ? "Yes" : "No");

    if (!isMatch) {
      console.log("Incorrect password for admin:", username);
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
        role: "admin",
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Prepare admin data for response
    const adminData = {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: "admin",
      isActive: admin.isActive,
      lastLogin: admin.lastLogin,
    };

    console.log("Login successful for admin:", username);

    // Send response
    return res.status(200).json({
      message: "Admin login successful",
      token,
      admin: adminData,
    });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
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
      return res.status(400).json({ error: "Invalid student ID format" });
    }

    console.log("Login attempt for studentId:", numericStudentId);

    // Check if student exists
    const student = await Student.findOne({ studentId: numericStudentId });
    console.log("Found student:", student ? "Yes" : "No");

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if student is active
    if (!student.isActive) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    // Check if password matches
    const isMatch = await student.comparePassword(password);
    console.log("Password match:", isMatch ? "Yes" : "No");

    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Update last login
    student.lastLogin = new Date();
    await student.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: student._id,
        studentId: student.studentId,
        role: "student",
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Send response with student data (excluding sensitive info)
    return res.json({
      message: "Student login successful",
      token,
      role: "student",
      student: student.getPublicProfile(),
    });
  } catch (err) {
    console.error("Login error details:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json(student.getPublicProfile());
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Internal server error" });
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
      return res.status(404).json({ error: "Admin not found" });
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    console.log("Current password match:", isMatch ? "Yes" : "No");

    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Internal server error" });
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
      return res.status(404).json({ error: "Admin not found" });
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Check if new username already exists
    const existingAdmin = await Admin.findOne({ username: newUsername });
    if (existingAdmin) {
      return res.status(409).json({ error: "Username already exists" });
    }

    // Update username
    admin.username = newUsername;
    await admin.save();

    res.json({ message: "Username updated successfully" });
  } catch (err) {
    console.error("Change username error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const user = req.user;
    const newToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.status(200).json({ token: newToken });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(500).json({ error: "Failed to refresh token" });
  }
};

// Email sending utility
const sendConfirmationEmail = async (to, token, studentDetails = {}) => {
  const transporter = nodemailer.createTransporter({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Use BACKEND_URL from environment, fallback to localhost for local dev
  const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
  const confirmUrl = `${baseUrl}/api/auth/confirm-email?token=${token}`;

  const { firstName, lastName, studentId, track, section, yearLevel } =
    studentDetails;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Confirm your email for GLEAS Registration",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirm Your GLEAS Registration</title>
        <style type="text/css">
          body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
          body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
        </style>
      </head>
      <body style="background-color: #0D131A; margin: 0 !important; padding: 20px 0 !important;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; margin: 0 auto;">
                <!-- Header / Logo -->
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <h1 style="font-family: 'Bangers', 'Arial Black', sans-serif; color: #82DFFF; font-size: 40px; margin: 0; letter-spacing: 1.5px;">GLEAS</h1>
                  </td>
                </tr>
                <!-- Main Content Panel -->
                <tr>
                  <td align="center" style="background-color: rgb(20, 30, 40); border-radius: 12px; border: 1px solid rgba(130, 223, 255, 0.5); padding: 30px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <!-- Welcome Title -->
                      <tr>
                        <td align="center" style="font-family: 'Roboto Condensed', Arial, sans-serif; font-size: 26px; color: #FFDE59; padding-bottom: 15px;">
                          Welcome to GLEAS, ${
                            firstName ? ` <b>${firstName}</b>` : "Adventurer"
                          }!
                        </td>
                      </tr>
                      <!-- Intro Text -->
                      <tr>
                        <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; color: #E0F2F7; line-height: 1.6; padding-bottom: 20px; text-align: center;">
                          Thank you for registering! We're excited to have you join our learning community. Please confirm your email address to activate your account.
                        </td>
                      </tr>
                      <!-- Registration Details Panel -->
                      ${
                        studentDetails && Object.keys(studentDetails).length > 0
                          ? `
                      <tr>
                        <td style="padding-bottom: 25px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(13, 20, 26, 0.7); border-radius: 8px; border: 1px solid rgba(130, 223, 255, 0.3); padding: 20px;">
                            <tr>
                              <td style="font-family: 'Roboto Condensed', Arial, sans-serif; font-size: 18px; color: #FFDE59; padding-bottom: 10px;">Your Registration Details:</td>
                            </tr>
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #A7C0C9; line-height: 1.7;">
                                ${
                                  firstName || lastName
                                    ? `<b>Name:</b> ${firstName || ""} ${
                                        lastName || ""
                                      }<br>`
                                    : ""
                                }
                                ${
                                  studentId
                                    ? `<b>Student ID:</b> ${studentId}<br>`
                                    : ""
                                }
                                ${track ? `<b>Track:</b> ${track}<br>` : ""}
                                ${
                                  section
                                    ? `<b>Section:</b> ${section}<br>`
                                    : ""
                                }
                                ${
                                  yearLevel
                                    ? `<b>Year Level:</b> ${yearLevel}<br>`
                                    : ""
                                }
                                <b>Email:</b> ${to}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      `
                          : ""
                      }
                      <!-- Confirmation Button -->
                      <tr>
                        <td align="center" style="padding-top: 10px; padding-bottom: 25px;">
                          <table border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td align="center" style="border-radius: 6px; background-color: #82DFFF;">
                                <a href="${confirmUrl}" target="_blank" style="font-family: 'Roboto Condensed', Arial, sans-serif; font-size: 18px; color: #0D131A; text-decoration: none; border-radius: 6px; padding: 14px 35px; border: 1px solid #82DFFF; display: inline-block; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Confirm Email Address</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- What's Next Section -->
                      <tr>
                        <td style="padding-top: 15px; padding-bottom: 15px; border-top: 1px solid rgba(130, 223, 255, 0.2);">
                            <h4 style="font-family: 'Roboto Condensed', Arial, sans-serif; font-size: 18px; color: #FFDE59; margin: 0 0 10px 0; text-align: center;">What's Next?</h4>
                            <ol style="font-family: 'Montserrat', Arial, sans-serif; font-size: 15px; color: #A7C0C9; line-height: 1.7; padding-left: 25px; margin: 0; text-align: left;">
                                <li>Click the <b>Confirm Email Address</b> button above.</li>
                                <li>Once confirmed, you can <b>log in</b> to your GLEAS account.</li>
                                <li>Start exploring, learning, and earning rewards!</li>
                            </ol>
                        </td>
                      </tr>
                      <!-- Footer Info -->
                      <tr>
                        <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #A7C0C9; line-height: 1.6; text-align: center; padding-top: 20px; border-top: 1px solid rgba(130, 223, 255, 0.2);">
                          If you didn't register for GLEAS, please disregard this email. If you have questions, feel free to contact our support team.
                          <br><br>
                          This link will expire in 24 hours.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Footer Copyright -->
                <tr>
                  <td align="center" style="padding: 25px 0 15px 0; font-family: 'Montserrat', Arial, sans-serif; font-size: 12px; color: #A7C0C9;">
                    &copy; ${new Date().getFullYear()} GLEAS. All rights reserved.<br>
                    Blueprint Capsule Corp. Division
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
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
      yearLevel,
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !studentId ||
      !password ||
      !track ||
      !section ||
      !yearLevel
    ) {
      return res
        .status(400)
        .json({ error: "All required fields must be filled." });
    }

    // Check if studentId or email already exists in Student
    const existingStudent = await Student.findOne({
      $or: [{ studentId }, { email }],
    });
    if (existingStudent) {
      return res
        .status(409)
        .json({ error: "Student ID or email already exists." });
    }

    // Create student directly (no email verification, no admin approval)
    const student = new Student({
      firstName,
      middleName,
      lastName,
      email,
      studentId,
      password,
      track,
      section,
      yearLevel,
      isEmailConfirmed: true, // Skip email verification
      isApproved: true, // Skip admin approval
    });

    await student.save();

    return res.status(201).json({
      success: true,
      message: "Registration successful! You can now log in.",
    });
  } catch (error) {
    console.error("Student registration error:", error);
    res
      .status(500)
      .json({ error: "Error registering student", details: error.message });
  }
};

// Email confirmation endpoint
const confirmEmail = async (req, res) => {
  try {
    const { token } = req.query;
    // Use FRONTEND_URL, fallback to CLIENT_URL, then localhost
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      "http://localhost:5173";
    // Always redirect to frontend, regardless of token validity
    res.redirect(`${frontendUrl}/registration-success?token=${token}`);
  } catch (error) {
    // On error, also redirect to frontend
    const fallbackUrl =
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      "http://localhost:5173";
    res.redirect(
      `${fallbackUrl}/registration-success?token=${req.query.token || ""}`
    );
  }
};

// Finalize registration endpoint
const finalizeRegistration = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: "No token provided." });
    }
    const pending = await PendingStudent.findOne({
      confirmationToken: token,
      confirmationExpires: { $gt: Date.now() },
    });
    if (!pending) {
      // Try to find the student in the database (already finalized)
      const student = await Student.findOne({
        $or: [{ email: req.query.email }, { studentId: req.query.studentId }],
      });
      if (student) {
        return res.json({ success: true, student: student.getPublicProfile() });
      }
      return res.status(400).json({ error: "Invalid or expired token." });
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
      isEmailConfirmed: true,
    });
    await student.save();
    await PendingStudent.deleteOne({ _id: pending._id });
    res.json({ success: true, student: student.getPublicProfile() });
  } catch (error) {
    console.error("Finalize registration error:", error);
    res
      .status(500)
      .json({ error: "Error finalizing registration", details: error.message });
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
      return res
        .status(404)
        .json({ error: "No student found with that email or ID." });
    }
    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    student.resetPasswordToken = token;
    student.resetPasswordExpires = Date.now() + 1000 * 60 * 30; // 30 minutes
    await student.save();
    // Send email
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    await sendPasswordResetEmail(student.email, resetUrl, student.firstName);
    res.json({
      success: true,
      message: "Password reset link sent to your email.",
    });
  } catch (error) {
    console.error("Request password reset error:", error);
    res.status(500).json({
      error: "Error requesting password reset",
      details: error.message,
    });
  }
};

// Send password reset email
const sendPasswordResetEmail = async (to, resetUrl, firstName) => {
  const transporter = nodemailer.createTransporter({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "GLEAS Password Reset Request",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GLEAS Password Reset</title>
        <style type="text/css">
          body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
          body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
        </style>
      </head>
      <body style="background-color: #0D131A; margin: 0 !important; padding: 20px 0 !important;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; margin: 0 auto;">
                <!-- Header / Logo -->
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <h1 style="font-family: 'Bangers', 'Arial Black', sans-serif; color: #82DFFF; font-size: 40px; margin: 0; letter-spacing: 1.5px;">GLEAS</h1>
                  </td>
                </tr>
                <!-- Main Content Panel -->
                <tr>
                  <td align="center" style="background-color: rgb(20, 30, 40); border-radius: 12px; border: 1px solid rgba(130, 223, 255, 0.5); padding: 30px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <!-- Title -->
                      <tr>
                        <td align="center" style="font-family: 'Roboto Condensed', Arial, sans-serif; font-size: 26px; color: #FFDE59; padding-bottom: 15px;">
                          Password Reset Request
                        </td>
                      </tr>
                      <!-- Intro Text -->
                      <tr>
                        <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; color: #E0F2F7; line-height: 1.6; padding-bottom: 10px; text-align: center;">
                          Hi${firstName ? ` <b>${firstName}</b>` : ""},
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; color: #E0F2F7; line-height: 1.6; padding-bottom: 20px; text-align: center;">
                          We received a request to reset your password. Click the button below to choose a new one. This link is valid for 30 minutes.
                        </td>
                      </tr>
                      <!-- Reset Button -->
                      <tr>
                        <td align="center" style="padding-top: 10px; padding-bottom: 25px;">
                          <table border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td align="center" style="border-radius: 6px; background-color: #82DFFF;">
                                <a href="${resetUrl}" target="_blank" style="font-family: 'Roboto Condensed', Arial, sans-serif; font-size: 18px; color: #0D131A; text-decoration: none; border-radius: 6px; padding: 14px 35px; border: 1px solid #82DFFF; display: inline-block; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Reset Your Password</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Footer Info -->
                      <tr>
                        <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #A7C0C9; line-height: 1.6; text-align: center; padding-top: 20px; border-top: 1px solid rgba(130, 223, 255, 0.2);">
                          If you didn't request a password reset, please ignore this email. Your account is still secure.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Footer Copyright -->
                <tr>
                  <td align="center" style="padding: 25px 0 15px 0; font-family: 'Montserrat', Arial, sans-serif; font-size: 12px; color: #A7C0C9;">
                    &copy; ${new Date().getFullYear()} GLEAS. All rights reserved.<br>
                    Blueprint Capsule Corp. Division
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
};

// Reset password using token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const student = await Student.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!student) {
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }
    student.password = newPassword;
    student.resetPasswordToken = undefined;
    student.resetPasswordExpires = undefined;
    await student.save();
    res.json({
      success: true,
      message: "Password has been reset. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res
      .status(500)
      .json({ error: "Error resetting password", details: error.message });
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
  resetPassword,
};
