require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../users/admin/models/adminModel');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // Create admin user
    const adminData = {
      username: 'admin',
      password: 'admin', // Changed to 'admin'
      email: 'admin@example.com',
      role: 'admin'
    };

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: adminData.username });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create new admin
    const admin = new Admin(adminData);
    await admin.save();
    console.log('Admin user created successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin(); 