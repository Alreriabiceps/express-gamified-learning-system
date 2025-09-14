const Student = require("../../student/models/Student");

// Middleware to check if student is approved for activities
exports.requireStudentApproval = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "student") {
      return res.status(403).json({ error: "Access denied. Students only." });
    }

    // Find the student to check approval status
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    // Check if student is approved
    if (!student.isApproved) {
      return res.status(403).json({
        error:
          "Account not yet approved by admin. You can browse but cannot participate in activities.",
        isApproved: false,
        message:
          "Please wait for admin approval to participate in exams, games, and other activities.",
      });
    }

    // Check if student is active
    if (!student.isActive) {
      return res.status(403).json({ error: "Account is deactivated." });
    }

    next();
  } catch (error) {
    console.error("Student approval check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Middleware to check if student is approved but allow browsing
exports.checkStudentApproval = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "student") {
      return res.status(403).json({ error: "Access denied. Students only." });
    }

    // Find the student to check approval status
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    // Add approval status to request for conditional logic
    req.studentApproval = {
      isApproved: student.isApproved,
      isActive: student.isActive,
    };

    next();
  } catch (error) {
    console.error("Student approval check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};





















