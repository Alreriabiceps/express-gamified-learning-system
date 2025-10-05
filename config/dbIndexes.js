const Student = require("../modules/student/models/Student");
const Admin = require("../modules/admin/models/Admin");

/**
 * Create database indexes for optimal login performance
 */
const createIndexes = async () => {
  try {
    console.log("Creating database indexes for authentication...");

    // Student indexes
    await Student.collection.createIndex(
      { studentId: 1 },
      { unique: true, background: true }
    );
    await Student.collection.createIndex(
      { email: 1 },
      { unique: true, background: true }
    );
    await Student.collection.createIndex(
      { isActive: 1, isApproved: 1 },
      { background: true }
    );

    // Admin indexes
    await Admin.collection.createIndex(
      { username: 1 },
      { unique: true, background: true }
    );
    await Admin.collection.createIndex(
      { email: 1 },
      { unique: true, background: true }
    );
    await Admin.collection.createIndex({ isActive: 1 }, { background: true });

    console.log("✓ Database indexes created successfully");
  } catch (error) {
    if (error.code === 85) {
      console.log("Note: Some indexes already exist, skipping...");
    } else {
      console.error("Error creating indexes:", error.message);
    }
  }
};

module.exports = { createIndexes };
