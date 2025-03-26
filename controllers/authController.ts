import { Request, Response } from 'express';
import UserModel from '../models/user';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendOtp } from '../services/emailService';

// register user functionality
export const registerUser = async (req: any, res: any) => {
  try {
    const { username, email, password } = req.body;
    console.log('Received registration request:', { username, email });

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(401).json({ message: 'User already exists' });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({
      username,
      email,
      password: hashPassword,
    });
    await newUser.save();

    const token = jwt.sign(
      {
        id: newUser._id,
        role: newUser.role,
        email: newUser.email,
        name: newUser.username,
        _id: newUser._id,
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

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
  } catch (error: any) {
    console.error('Registration error details:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// register admin functionality
export const registerAdmin = async (req: any, res: any) => {
  try {
    const { username, email, password, role } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(401).json({ message: 'User already exists' });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({
      username,
      email,
      password: hashPassword,
      role,
    });
    await newUser.save();

    const token = jwt.sign(
      {
        id: newUser._id,
        role: newUser.role,
        name: newUser.username,
        email: newUser.email,
        _id: newUser._id, // Also add _id to match what your controller expects
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

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
  } catch (error: any) {
    console.error('Registration error details:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// login user functionality
export const loginUser = async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const findUser = await UserModel.findOne({ email });

    if (!findUser) {
      return res.status(401).json({ message: 'Wrong credentials' });
    }

    const validPassword = await bcrypt.compare(password, findUser.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Wrong credentials' });
    }

    const token = jwt.sign(
      {
        id: findUser._id,
        role: findUser.role,
        email: findUser.email,
        name: findUser.username,
        _id: findUser._id,
        // Also add _id to match what your controller expects
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );
    const userObject: any = findUser.toObject()
      delete userObject.password;
    
      delete userObject.otp;
    
    return res.status(200).json({
      message: 'Login successful',
      user: userObject,
      access_token: token,
    });
  } catch (error) {
    console.error('Login error details:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
