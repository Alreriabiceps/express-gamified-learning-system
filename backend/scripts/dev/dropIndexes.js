/**
 * Script to drop all MongoDB indexes
 * 
 * Usage: 
 * 1. Set ENABLE_INDEX_DROP=true in your .env file
 * 2. node scripts/dev/dropIndexes.js
 * 
 * Warning: This script requires explicit permission via environment variable
 * to prevent accidental index drops. The script will fail if ENABLE_INDEX_DROP
 * is not set to true.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const config = require('../../config/config');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => {
    return new Promise((resolve) => rl.question(query, resolve));
};

const dropIndexes = async () => {
    try {
        // Safety check
        if (process.env.ENABLE_INDEX_DROP !== 'true') {
            throw new Error('Index drop is not enabled. Set ENABLE_INDEX_DROP=true in your .env file to proceed.');
        }

        // Confirmation prompt
        const answer = await askQuestion('WARNING: This will drop all indexes except _id. Are you sure? (yes/no): ');
        if (answer.toLowerCase() !== 'yes') {
            console.log('Operation cancelled by user');
            rl.close();
            process.exit(0);
        }

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB Atlas');

        // Get all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections to process`);

        // Drop indexes for each collection
        for (const collection of collections) {
            const collectionName = collection.name;
            console.log(`\nProcessing collection: ${collectionName}`);

            try {
                const indexes = await mongoose.connection.db.collection(collectionName).indexes();
                const nonIdIndexes = indexes.filter(index => index.name !== '_id_');

                if (nonIdIndexes.length === 0) {
                    console.log(`No non-_id indexes found in ${collectionName}`);
                    continue;
                }

                console.log(`Found ${nonIdIndexes.length} non-_id indexes in ${collectionName}`);

                // Drop all indexes except the default _id index
                for (const index of nonIdIndexes) {
                    await mongoose.connection.db.collection(collectionName).dropIndex(index.name);
                    console.log(`Dropped index: ${index.name} from ${collectionName}`);
                }
            } catch (error) {
                console.error(`Error processing collection ${collectionName}:`, error.message);
            }
        }

        console.log('\nIndex drop completed successfully');
        console.log('IMPORTANT: Disable ENABLE_INDEX_DROP in your .env file after use');
        rl.close();
        process.exit(0);
    } catch (error) {
        console.error('Error dropping indexes:', error.message);
        rl.close();
        process.exit(1);
    }
};

// Run the script
dropIndexes(); 