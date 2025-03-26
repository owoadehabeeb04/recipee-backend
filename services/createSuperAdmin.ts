import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import UserModel from '../models/user';
import dotenv from 'dotenv';

dotenv.config();

const createSuperAdmin = async () => {
  const password = await bcrypt.hash('superadmin123!', 10);
  try {
    // connect to mongodb
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || '');
      console.log('Connected to MongoDB');
    }
    await UserModel.create({
      username: 'superadmin',
      email: 'habeebowoade8@gmail.com',
      password,
      role: 'super_admin',
    });
    console.log('superadmin created successfully');
  } catch (error) {
    console.error('Failed to create ');
  }
};
// (async () => {
//   await createSuperAdmin();
// })();
