const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken } = require('../../auth/middleware/authMiddleware');

// Route to add a student
router.post('/', verifyToken, studentController.addStudent);

// Route to get all students
router.get('/', verifyToken, studentController.getAllStudents);

// Get student by ID
router.get('/:id', verifyToken, studentController.getStudentById);

// Update student
router.put('/:id', verifyToken, studentController.updateStudent);

// Delete student
router.delete('/:id', verifyToken, studentController.deleteStudent);

module.exports = router; 