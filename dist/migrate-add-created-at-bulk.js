"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// migrate-add-created-at-bulk.ts
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '.env') });
async function addCreatedAtBulk() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database');
        console.log('Connected to MongoDB');
        // Get the users collection directly
        const db = mongoose_1.default.connection.db;
        if (!db) {
            throw new Error('Database connection is not established');
        }
        const usersCollection = db.collection('users');
        // Find users without createdAt but with updatedAt
        const updateWithUpdatedAt = await usersCollection.updateMany({
            createdAt: { $exists: false },
            updatedAt: { $exists: true },
        }, [
            {
                $set: {
                    createdAt: '$updatedAt',
                },
            },
        ]);
        console.log(`Updated ${updateWithUpdatedAt.modifiedCount} users with createdAt from updatedAt`);
        // For remaining users without createdAt, extract from ObjectId
        const cursor = usersCollection.find({ createdAt: { $exists: false } });
        let count = 0;
        for await (const doc of cursor) {
            if (doc._id) {
                // Extract timestamp from ObjectId
                const timestamp = Math.floor(doc._id.getTimestamp().getTime() / 1000) * 1000;
                const createdAt = new Date(timestamp);
                await usersCollection.updateOne({ _id: doc._id }, { $set: { createdAt: createdAt } });
                count++;
                if (count % 100 === 0) {
                    console.log(`Updated ${count} documents...`);
                }
            }
        }
        console.log(`Updated ${count} additional users with createdAt from ObjectId timestamp`);
        // Check if any users still don't have createdAt
        const remaining = await usersCollection.countDocuments({
            createdAt: { $exists: false },
        });
        if (remaining > 0) {
            console.log(`${remaining} users still don't have createdAt, setting to current date`);
            // Set current date for any remaining documents
            const now = new Date();
            await usersCollection.updateMany({ createdAt: { $exists: false } }, { $set: { createdAt: now } });
        }
        console.log('Migration completed successfully');
    }
    catch (error) {
        console.error('Error in bulk createdAt update:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
    }
}
addCreatedAtBulk();
