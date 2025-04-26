const mongoose = require('mongoose');
require('dotenv').config();

const dropIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Drop the specific weekNumber_1_year_1 index
    console.log('Dropping weekNumber_1_year_1 index from weekschedules collection');
    await db.collection('weekschedules').dropIndex('weekNumber_1_year_1');
    console.log('weekNumber_1_year_1 index dropped successfully');

    // Drop all other indexes
    console.log('Dropping all other indexes from weekschedules collection');
    await db.collection('weekschedules').dropIndexes();
    console.log('All other indexes dropped successfully');

    console.log('Index cleanup completed successfully');
  } catch (error) {
    if (error.code === 26) {
      console.log('Index not found, continuing with cleanup');
    } else {
      console.error('Error dropping indexes:', error);
    }
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

dropIndexes(); 