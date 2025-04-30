const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

async function addNutritionField() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get the recipes collection
    const db = mongoose.connection.db;
    const recipesCollection = db.collection('recipes');

    // Count recipes that don't have nutrition field
    const recipesWithoutNutrition = await recipesCollection.countDocuments({
      nutrition: { $exists: false },
    });
    console.log(
      `Found ${recipesWithoutNutrition} recipes without nutrition field`
    );

    // Update all recipes without nutrition field
    const result = await recipesCollection.updateMany(
      { nutrition: { $exists: false } },
      {
        $set: {
          nutrition: {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
          },
        },
      }
    );

    console.log(
      `Updated ${result.modifiedCount} recipes with default nutrition data`
    );

    // Verify update
    const verifyCount = await recipesCollection.countDocuments({
      nutrition: { $exists: true },
    });
    console.log(`Now ${verifyCount} recipes have nutrition field`);
  } catch (error) {
    console.error('Error in migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
