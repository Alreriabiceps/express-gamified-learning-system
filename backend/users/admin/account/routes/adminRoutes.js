const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../../../../auth/authMiddleware');

// Get all admins (protected route)
router.get('/', verifyToken, adminController.getAllAdmins);

// Get admin by ID (protected route)
router.get('/:id', verifyToken, adminController.getAdminById);

// Create new admin (protected route)
router.post('/', verifyToken, adminController.createAdmin);

// Update admin (protected route)
router.put('/:id', verifyToken, adminController.updateAdmin);

// Delete admin (protected route)
router.delete('/:id', verifyToken, adminController.deleteAdmin);

module.exports = router; 