// migrate-add-timestamps.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import your User model - adjust the path as needed
import UserModel from './models/user';

async function addTimestampsToUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database_name'
    );
    console.log('Connected to MongoDB');

    // Find all users without timestamps
    const usersWithoutTimestamps = await UserModel.find({
      $or: [
        { createdAt: { $exists: false } },
        { updatedAt: { $exists: false } },
      ],
    });

    console.log(
      `Found ${usersWithoutTimestamps.length} users without timestamps`
    );

    // Update each user
    let updatedCount = 0;
    for (const user of usersWithoutTimestamps) {
      const now = new Date();

      // If _id contains a timestamp, extract it for a more accurate createdAt
      let createdAt = now;
      if (mongoose.Types.ObjectId.isValid(user._id as string)) {
        const timestamp = Math.floor(
          parseInt((user._id as string).toString().substring(0, 8), 16)
        );
        if (timestamp) {
          createdAt = new Date(timestamp * 1000);
        }
      }

      // Update the user with timestamps
      await UserModel.updateOne(
        { _id: user._id },
        {
          $set: {
            createdAt: createdAt,
            updatedAt: now,
          },
        }
      );
      updatedCount++;
      console.log(
        `Updated user: ${user.username} (${updatedCount}/${usersWithoutTimestamps.length})`
      );
    }

    console.log(`Successfully updated ${updatedCount} users with timestamps`);
  } catch (error) {
    console.error('Error migrating timestamps:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
// addTimestampsToUsers();
