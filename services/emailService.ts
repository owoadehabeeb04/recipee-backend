import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// CREATE A TRANSPORTER FOR THE NODEMAILER

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
console.log('email pass', process.env.EMAIL_PASS);

// THE OTP FUNCTION

export const sendOtp = async (email: string, otpCode: string) => {
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
  } catch (error) {
    console.error(error);
    return false;
  }
};
