const Student = require('../models/studentModels');

// Create a new student
exports.addStudent = async (req, res) => {
  try {
    const { 
      firstName, 
      middleName, 
      lastName, 
      age, 
      studentId, 
      strand, 
      section, 
      yearLevel,
      password 
    } = req.body;

    // Check if student already exists
    const existingStudent = await Student.findOne({ studentId });
    if (existingStudent) {
      return res.status(409).json({ success: false, message: 'Student already exists' });
    }

    // Create new student if not exists
    const newStudent = new Student({
      firstName,
      middleName,
      lastName,
      age,
      studentId,
      strand,
      section,
      yearLevel,
      password: password || studentId.toString() // Use studentId as default password if not provided
    });

    await newStudent.save();
    res.status(201).json({ 
      success: true, 
      message: 'Student added successfully!',
      student: newStudent.getPublicProfile()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error adding student', error: error.message });
  }
};

// Fetch all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().select('-password');
    res.status(200).json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching students', error: error.message });
  }
};

// Update student
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // If password is being updated, it will be hashed by the pre-save middleware
    const student = await Student.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Student updated successfully',
      student 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error updating student', error: error.message });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findByIdAndDelete(id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Student deleted successfully' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting student', error: error.message });
  }
};

// Get student by ID
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Get student's current rank based on total points
    const getRank = (totalPoints) => {
      if (totalPoints >= 850) return 'Valedictorian';
      if (totalPoints >= 700) return "Dean's Lister";
      if (totalPoints >= 550) return 'High Honors';
      if (totalPoints >= 400) return 'Honor Student';
      if (totalPoints >= 250) return 'Scholar';
      return 'Apprentice';
    };

    // Get student's public profile and add rank
    const studentProfile = student.getPublicProfile();
    studentProfile.currentRank = getRank(student.totalPoints || 0);

    res.status(200).json({
      success: true,
      data: studentProfile
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching student data",
      error: error.message
    });
  }
};
