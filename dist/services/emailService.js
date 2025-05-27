"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtp = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // Remove the manual host/port/secure settings when using 'service: gmail'
    // Gmail service preset handles these automatically
});
// Alternative explicit configuration if the above doesn't work
// const transporter = nodemailer.createTransport({
//   host: 'smtp.gmail.com',
//   port: 587,
//   secure: false, // false for STARTTLS
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
//   tls: {
//     rejectUnauthorized: false
//   }
// });
// Test the connection
transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP connection error:', error);
    }
    else {
        console.log('SMTP server is ready to take our messages');
    }
});
console.log('email pass', ((_a = process.env.EMAIL_PASS) === null || _a === void 0 ? void 0 : _a.substring(0, 4)) + '***'); // Don't log full password
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
        console.log({ info });
        return true;
    }
    catch (error) {
        console.error(error);
        return false;
    }
};
exports.sendOtp = sendOtp;
