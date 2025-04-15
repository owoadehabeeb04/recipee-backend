"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.resetPassword = exports.verifyOTP = exports.verifyEmail = void 0;
const user_1 = __importDefault(require("../models/user"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const emailService_1 = require("../services/emailService");
// Helper function to generate OTP
const generateOTP = () => {
    return crypto_1.default.randomInt(100000, 999999).toString();
};
const verifyEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const userEmail = await user_1.default.findOne({ email });
        if (!userEmail) {
            return res.status(400).json({ message: 'Email not found' });
        }
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        userEmail.otp = { code: otp, expiresAt: expiresAt };
        // Send OTP via email
        const emailSent = await (0, emailService_1.sendOtp)(email, otp);
        if (!emailSent) {
            return res.status(400).json({ message: 'Failed to send OTP email' });
        }
        // Save OTP to user document in the database
        await userEmail.save();
        return res.status(200).json({
            message: 'Verification code sent successfully',
            expiresAt,
        });
    }
    catch (error) {
        console.error('An unknown error occurred:', error);
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
exports.verifyEmail = verifyEmail;
const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await user_1.default.findOne({ email });
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
        }
        else {
            return res.status(400).json({
                message: 'Invalid OTP',
            });
        }
    }
    catch (error) {
        console.error('OTP verification error:', error);
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
exports.verifyOTP = verifyOTP;
const resetPassword = async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashPassword = await bcrypt_1.default.hash(password, 10);
        const user = await user_1.default.findOne({ email });
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
exports.resetPassword = resetPassword;
// change password with current password
const changePassword = async (req, res) => {
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
        const user = await user_1.default.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
        const isPasswordValid = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect',
            });
        }
        const hashedNewPassword = await bcrypt_1.default.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();
        return res.status(200).json({
            success: true,
            message: 'Password changed successfully',
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
exports.changePassword = changePassword;
