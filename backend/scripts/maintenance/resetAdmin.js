/**
 * Script to reset admin user password
 * 
 * Usage: 
 * 1. Set ENABLE_ADMIN_RESET=true in your .env file
 * 2. node scripts/maintenance/resetAdmin.js
 * 
 * Warning: This script requires explicit permission via environment variable
 * to prevent accidental password resets. The script will fail if ENABLE_ADMIN_RESET
 * is not set to true.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const Admin = require('../../users/admin/models/adminModel');
const config = require('../../config/config');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => {
    return new Promise((resolve) => rl.question(query, resolve));
};

const resetAdmin = async () => {
    try {
        // Safety check
        if (process.env.ENABLE_ADMIN_RESET !== 'true') {
            throw new Error('Admin reset is not enabled. Set ENABLE_ADMIN_RESET=true in your .env file to proceed.');
        }

        // Confirmation prompt
        const answer = await askQuestion('WARNING: This will reset the admin password. Are you sure? (yes/no): ');
        if (answer.toLowerCase() !== 'yes') {
            console.log('Operation cancelled by user');
            rl.close();
            process.exit(0);
        }

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB Atlas');

        // Find admin user
        const admin = await Admin.findOne({ username: 'admin' });
        if (!admin) {
            throw new Error('Admin user not found');
        }

        // Reset password
        const newPassword = process.env.ADMIN_PASSWORD || 'admin123';
        admin.password = newPassword;
        await admin.save();

        console.log('\nAdmin password reset successfully');
        console.log('New password:', newPassword);
        console.log('IMPORTANT: Disable ENABLE_ADMIN_RESET in your .env file after use');
        rl.close();
        process.exit(0);
    } catch (error) {
        console.error('Error resetting admin password:', error.message);
        rl.close();
        process.exit(1);
    }
};

// Run the script
resetAdmin(); 