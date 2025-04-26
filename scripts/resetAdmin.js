require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../users/admin/models/adminModel');
const bcryptjs = require('bcryptjs');

const resetAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // Delete all existing admins
    await Admin.deleteMany({});
    console.log('All admin users deleted');

    // Create new admin with plain password
    const adminData = {
      username: 'admin',
      password: 'admin',
      email: 'admin@example.com',
      role: 'admin'
    };

    // Create new admin
    const admin = new Admin(adminData);
    await admin.save();

    // Verify the password was hashed
    const savedAdmin = await Admin.findOne({ username: 'admin' });
    console.log('Admin created successfully');
    console.log('Stored password hash:', savedAdmin.password);

    // Test password comparison
    const isMatch = await bcryptjs.compare('admin', savedAdmin.password);
    console.log('Password comparison test:', isMatch ? 'Success' : 'Failed');

    process.exit(0);
  } catch (error) {
    console.error('Error resetting admin:', error);
    process.exit(1);
  }
};

resetAdmin(); 