const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// Route to add a student
router.post('/', studentController.addStudent);

// Route to get all students
router.get('/', studentController.getAllStudents); // Add this route

module.exports = router;
