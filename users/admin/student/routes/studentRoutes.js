const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken } = require('../../../../auth/authMiddleware');

// Route to add a student
router.post('/', studentController.addStudent);

// Route to get all students
router.get('/', studentController.getAllStudents); // Add this route

// Get student by ID
router.get('/:id', verifyToken, studentController.getStudentById);

module.exports = router;
