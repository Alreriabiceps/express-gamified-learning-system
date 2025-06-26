const express = require('express');
const router = express.Router();

// Import module routes
const authRoutes = require('./auth/routes/authRoutes');
const adminRoutes = require('./admin/routes/adminRoutes');
const studentRoutes = require('./student/routes/studentRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/student', studentRoutes);

module.exports = router; 