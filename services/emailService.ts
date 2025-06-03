import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();


const transporter = nodemailer.createTransport({
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
});


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
    console.log({info}) 
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};
