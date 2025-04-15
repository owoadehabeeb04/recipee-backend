import { Request, Response } from 'express';
import UserModel from '../models/user';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendOtp } from '../services/emailService';

// Helper function to generate OTP
const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const verifyEmail = async (req: any, res: any) => {
  try {
    const { email } = req.body;
    const userEmail = await UserModel.findOne({ email });

    if (!userEmail) {
      return res.status(400).json({ message: 'Email not found' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    userEmail.otp = { code: otp, expiresAt: expiresAt };

    // Send OTP via email
    const emailSent = await sendOtp(email, otp);
    if (!emailSent) {
      return res.status(400).json({ message: 'Failed to send OTP email' });
    }

    // Save OTP to user document in the database
    await userEmail.save();

    return res.status(200).json({
      message: 'Verification code sent successfully',
      expiresAt,
    });
  } catch (error) {
    console.error('An unknown error occurred:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const verifyOTP = async (req: any, res: any) => {
  const { email, otp } = req.body;

  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.otp && user.otp.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (user.otp && user.otp.code === otp) {
      return res.status(200).json({
        message: 'OTP verified successfully',
      });
    } else {
      return res.status(400).json({
        message: 'Invalid OTP',
      });
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const resetPassword = async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const hashPassword = await bcrypt.hash(password, 10);
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: 'User does not exist',
      });
    }

    user.password = hashPassword;
    await user.save();

    return res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// change password with current password
export const changePassword = async (req: any, res: any) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, current password and new password are required',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
      });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedNewPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
