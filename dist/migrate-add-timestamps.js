"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// migrate-add-timestamps.ts
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '.env') });
// Import your User model - adjust the path as needed
const user_1 = __importDefault(require("./models/user"));
async function addTimestampsToUsers() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database_name');
        console.log('Connected to MongoDB');
        // Find all users without timestamps
        const usersWithoutTimestamps = await user_1.default.find({
            $or: [
                { createdAt: { $exists: false } },
                { updatedAt: { $exists: false } },
            ],
        });
        console.log(`Found ${usersWithoutTimestamps.length} users without timestamps`);
        // Update each user
        let updatedCount = 0;
        for (const user of usersWithoutTimestamps) {
            const now = new Date();
            // If _id contains a timestamp, extract it for a more accurate createdAt
            let createdAt = now;
            if (mongoose_1.default.Types.ObjectId.isValid(user._id)) {
                const timestamp = Math.floor(parseInt(user._id.toString().substring(0, 8), 16));
                if (timestamp) {
                    createdAt = new Date(timestamp * 1000);
                }
            }
            // Update the user with timestamps
            await user_1.default.updateOne({ _id: user._id }, {
                $set: {
                    createdAt: createdAt,
                    updatedAt: now,
                },
            });
            updatedCount++;
            console.log(`Updated user: ${user.username} (${updatedCount}/${usersWithoutTimestamps.length})`);
        }
        console.log(`Successfully updated ${updatedCount} users with timestamps`);
    }
    catch (error) {
        console.error('Error migrating timestamps:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
    }
}
// Run the migration
// addTimestampsToUsers();
