const Admin = require('../models/adminModel');
const bcryptjs = require('bcryptjs');

// Get all admins
exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find()
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: admins
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get admin by ID
exports.getAdminById = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id)
            .select('-password');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        res.json({
            success: true,
            data: admin
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create new admin
exports.createAdmin = async (req, res) => {
    try {
        const { username, password, firstName, lastName, email } = req.body;

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }

        // Create new admin
        const admin = new Admin({
            username,
            password,
            firstName,
            lastName,
            email
        });

        await admin.save();

        // Remove password from response
        const adminResponse = admin.toObject();
        delete adminResponse.password;

        res.status(201).json({
            success: true,
            data: adminResponse
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update admin
exports.updateAdmin = async (req, res) => {
    try {
        const { firstName, lastName, email, isActive } = req.body;
        const adminId = req.params.id;

        // Find admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Update fields
        if (firstName) admin.firstName = firstName;
        if (lastName) admin.lastName = lastName;
        if (email) admin.email = email;
        if (typeof isActive === 'boolean') admin.isActive = isActive;

        await admin.save();

        // Remove password from response
        const adminResponse = admin.toObject();
        delete adminResponse.password;

        res.json({
            success: true,
            data: adminResponse
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete admin
exports.deleteAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Prevent deleting the last admin
        const adminCount = await Admin.countDocuments();
        if (adminCount <= 1) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete the last admin'
            });
        }

        await admin.deleteOne();

        res.json({
            success: true,
            message: 'Admin deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 