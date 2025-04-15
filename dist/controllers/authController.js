"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerAdmin = exports.registerUser = void 0;
const user_1 = __importDefault(require("../models/user"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
//  // migrate-add-timestamps.ts
// import mongoose from 'mongoose';
// async function addTimestampsToUsers() {
//   try {
//     console.log('Connecting to MongoDB...');
//     await mongoose.connect(process.env.MONGODB_URI || 'your-connection-string');
//     console.log('Connected to MongoDB');
//     // Find all users without timestamps
//     const usersWithoutTimestamps = await UserModel.find({
//       $or: [
//         { createdAt: { $exists: false } },
//         { updatedAt: { $exists: false } }
//       ]
//     });
//     console.log(`Found ${usersWithoutTimestamps.length} users without timestamps`);
//     // Update each user
//     let updatedCount = 0;
//     for (const user of usersWithoutTimestamps) {
//       const now = new Date();
//       // If _id contains a timestamp, extract it for a more accurate createdAt
//       let createdAt = now;
//       if (mongoose.Types.ObjectId.isValid(user._id as string)) {
//         const timestamp = Math.floor(
//           parseInt((user._id as string).toString().substring(0, 8), 16)
//         );
//         if (timestamp) {
//           createdAt = new Date(timestamp * 1000);
//         }
//       }
//       // Update the user with timestamps
//       await UserModel.updateOne(
//         { _id: user._id },
//         {
//           $set: {
//             createdAt: createdAt,
//             updatedAt: now
//           }
//         }
//       );
//       updatedCount++;
//       console.log(`Updated user: ${user.username} (${updatedCount}/${usersWithoutTimestamps.length})`);
//     }
//     console.log(`Successfully updated ${updatedCount} users with timestamps`);
//   } catch (error) {
//     console.error('Error migrating timestamps:', error);
//   } finally {
//     await mongoose.disconnect();
//     console.log('Disconnected from MongoDB');
//   }
// }
// // Run the migration
// addTimestampsToUsers();
// register user functionality
const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        console.log('Received registration request:', { username, email });
        const existingUser = await user_1.default.findOne({ email });
        if (existingUser) {
            return res.status(401).json({ message: 'User already exists' });
        }
        const hashPassword = await bcrypt_1.default.hash(password, 10);
        const newUser = new user_1.default({
            username,
            email,
            password: hashPassword,
        });
        await newUser.save();
        const token = jsonwebtoken_1.default.sign({
            id: newUser._id,
            role: newUser.role,
            email: newUser.email,
            name: newUser.username,
            _id: newUser._id,
        }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        return res.status(201).json({
            message: 'User created successfully',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
            },
            access_token: token,
        });
    }
    catch (error) {
        console.error('Registration error details:', error);
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
exports.registerUser = registerUser;
// register admin functionality
const registerAdmin = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const existingUser = await user_1.default.findOne({ email });
        if (existingUser) {
            return res.status(401).json({ message: 'User already exists' });
        }
        const hashPassword = await bcrypt_1.default.hash(password, 10);
        const newUser = new user_1.default({
            username,
            email,
            password: hashPassword,
            role,
        });
        await newUser.save();
        const token = jsonwebtoken_1.default.sign({
            id: newUser._id,
            role: newUser.role,
            name: newUser.username,
            email: newUser.email,
            _id: newUser._id, // Also add _id to match what your controller expects
        }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        return res.status(201).json({
            message: 'User created successfully',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
            },
            access_token: token,
        });
    }
    catch (error) {
        console.error('Registration error details:', error);
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
exports.registerAdmin = registerAdmin;
// login user functionality
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await user_1.default.findOne({ email });
        if (!findUser) {
            return res.status(401).json({ message: 'Wrong credentials' });
        }
        const validPassword = await bcrypt_1.default.compare(password, findUser.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Wrong credentials' });
        }
        const token = jsonwebtoken_1.default.sign({
            id: findUser._id,
            role: findUser.role,
            email: findUser.email,
            name: findUser.username,
            _id: findUser._id,
            // Also add _id to match what your controller expects
        }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        const userObject = findUser.toObject();
        delete userObject.password;
        delete userObject.otp;
        return res.status(200).json({
            message: 'Login successful',
            user: userObject,
            access_token: token,
        });
    }
    catch (error) {
        console.error('Login error details:', error);
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
exports.loginUser = loginUser;
