"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtp = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// CREATE A TRANSPORTER FOR THE NODEMAILER
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
console.log('email pass', process.env.EMAIL_PASS);
// THE OTP FUNCTION
const sendOtp = async (email, otpCode) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP Verification Code',
            text: `Welcome to my recipe app! Your OTP verification code is: ${otpCode}. It will expire in 10 minutes.`,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(info.response);
        return true;
    }
    catch (error) {
        console.error(error);
        return false;
    }
};
exports.sendOtp = sendOtp;
