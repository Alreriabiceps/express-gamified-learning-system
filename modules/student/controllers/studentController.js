const Student = require('../models/Student');
const mongoose = require('mongoose');

// Create new students (handles both single student and bulk students)
exports.addStudent = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    
    // Handle both single student and bulk students
    let studentsToAdd = [];
    
    if (req.body.students) {
      // Bulk students from frontend
      studentsToAdd = req.body.students;
    } else {
      // Single student
      studentsToAdd = [req.body];
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < studentsToAdd.length; i++) {
      const studentData = studentsToAdd[i];
      
      try {
        const { 
          firstName, 
          middleName, 
          lastName, 
          age, 
          studentId, 
          grade,    // From frontend
          track,    // From frontend  
          section, 
          password 
        } = studentData;

        // Map frontend fields to backend model fields
        const mappedData = {
          firstName,
          middleName,
          lastName,
          age,
          studentId: Number(studentId),
          track: track, // Track is now directly "Academic Track" or "Technical-Professional Track"
          section,
          yearLevel: grade === '11' ? 'Grade 11' : 'Grade 12',
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${studentId}@student.gleas.edu.ph`, // Generate email
          password: password || studentId.toString()
        };

        // Check if student already exists
        const existingStudent = await Student.findOne({ studentId: mappedData.studentId });
        if (existingStudent) {
          errors.push({ index: i + 1, message: `Student ID ${studentId} already exists` });
          continue;
        }

        // Create new student
        const newStudent = new Student(mappedData);
        await newStudent.save();
        
        results.push({
          index: i + 1,
          student: newStudent.getPublicProfile(),
          message: 'Student added successfully'
        });

      } catch (studentError) {
        console.error(`Error adding student ${i + 1}:`, studentError);
        errors.push({ 
          index: i + 1, 
          message: studentError.message || 'Error adding student' 
        });
      }
    }

    // Return results
    if (errors.length === 0) {
      res.status(201).json({ 
        success: true, 
        message: `${results.length} student(s) added successfully!`,
        students: results
      });
    } else if (results.length === 0) {
      res.status(400).json({ 
        success: false, 
        message: 'No students could be added',
        errors: errors
      });
    } else {
      res.status(207).json({ 
        success: true, 
        message: `${results.length} student(s) added, ${errors.length} failed`,
        students: results,
        errors: errors
      });
    }
  } catch (error) {
    console.error('Controller error:', error);
    res.status(500).json({ success: false, message: 'Error adding student(s)', error: error.message });
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

// Update student by studentId or _id
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    let query = [];
    // Always try studentId as number if possible
    if (!isNaN(Number(id))) {
      query.push({ studentId: Number(id) });
    }
    // Only add _id if valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.push({ _id: id });
    }
    if (query.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid student ID format' });
    }
    let student = await Student.findOneAndUpdate(
      { $or: query },
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

// Delete student by studentId or _id
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    let query = [];
    if (!isNaN(Number(id))) {
      query.push({ studentId: Number(id) });
    }
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.push({ _id: id });
    }
    if (query.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid student ID format' });
    }
    let student = await Student.findOneAndDelete({ $or: query });
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
    let student = null;
    if (!isNaN(Number(id))) {
      student = await Student.findOne({ studentId: Number(id) });
    }
    if (!student && mongoose.Types.ObjectId.isValid(id)) {
      student = await Student.findById(id);
    }
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Get student's current rank based on total points
    const getRank = (totalPoints) => {
      if (totalPoints >= 5000) return "Diamond";
      if (totalPoints >= 3000) return "Platinum";
      if (totalPoints >= 1500) return "Gold";
      if (totalPoints >= 500) return "Silver";
      return "Bronze";
    };

    const studentProfile = student.getPublicProfile();
    studentProfile.rank = getRank(student.totalPoints);

    res.status(200).json({
      success: true,
      student: studentProfile
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching student', 
      error: error.message 
    });
  }
}; 