"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
require('dotenv').config();
// Connect to MongoDB
async function updateExistingRecipes() {
    try {
        console.log('Connecting to MongoDB...');
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI is not defined in the environment variables');
        }
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB');
        const db = mongoose_1.default.connection.db;
        if (!db) {
            throw new Error('Database connection is undefined');
        }
        const recipesCollection = db.collection('recipes');
        // Count recipes without the new fields
        const recipesWithoutNewFields = await recipesCollection.countDocuments({
            $or: [
                { roleCreated: { $exists: false } },
                { isPrivate: { $exists: false } },
            ],
        });
        console.log(`Found ${recipesWithoutNewFields} recipes without the new fields`);
        // Update all recipes that don't have the new fields
        const updateResult = await recipesCollection.updateMany({ roleCreated: { $exists: false } }, { $set: { roleCreated: 'admin', isPrivate: false } });
        console.log(`Updated ${updateResult.modifiedCount} recipes with default values:
      - roleCreated: "admin"
      - isPrivate: false
    `);
        // Verify update
        const verifyRoleCreated = await recipesCollection.countDocuments({
            roleCreated: 'admin',
        });
        const verifyIsPrivate = await recipesCollection.countDocuments({
            isPrivate: false,
        });
        console.log(`Verification:
      - ${verifyRoleCreated} recipes now have roleCreated="admin"
      - ${verifyIsPrivate} recipes now have isPrivate=false
    `);
    }
    catch (error) {
        console.error('Error in migration:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
    }
}
// Run the migration
// updateExistingRecipes();
