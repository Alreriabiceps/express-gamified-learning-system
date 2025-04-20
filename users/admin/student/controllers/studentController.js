const Student = require('../models/studentModels');

// Create a new student
exports.addStudent = async (req, res) => {
  try {
    const { firstName, middleName, lastName, age, studentId, strand, section, yearLevel } = req.body;

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
      yearLevel
    });

    await newStudent.save();
    res.status(201).json({ success: true, message: 'Student added successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error adding student', error: error.message });
  }
};

// Fetch all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find();
    res.status(200).json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching students', error: error.message });
  }
};
