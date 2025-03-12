import express from 'express';
import { loginUser, registerAdmin, registerUser } from '../controllers/authController';
import { resetPassword, verifyEmail, verifyOTP } from '../controllers/passwordController';

const router = express.Router();

// User registration and authentication routes
router.post('/register', registerUser);
router.post('/register/admin', registerAdmin);
router.post('/login', loginUser);
// Password and verification
router.post('/verify-email', verifyEmail);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);



export { router as userRouter };



// import express, { Router } from 'express';
// import { Request, Response } from 'express';
// import UserModel from '../models/user';
// import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken';
// import crypto from 'crypto';
// import { sendOtp } from '../services/emailService';
// const router: Router = express.Router();

// // REGISTER USER ENDPOINT
// router.post('/register', async (req: any, res: any) => {
//   try {
//     const { username, email, password } = req.body;
//     console.log('Received registration request:', { username, email });

//     const existingUser = await UserModel.findOne({ email });
//     if (existingUser) {
//       return res.status(401).json({ message: 'User already exists' });
//     }

//     const hashPassword = await bcrypt.hash(password, 10);
//     const newUser = new UserModel({
//       username,
//       email,
//       password: hashPassword,
//     });
//     await newUser.save();

//     const token = jwt.sign(
//       { id: newUser._id },
//       process.env.JWT_SECRET || 'secret',
//       { expiresIn: '1d' }
//     );

//     return res.status(201).json({
//       message: 'User created successfully',
//       user: {
//         id: newUser._id,
//         username: newUser.username,
//         email: newUser.email,
//         role: newUser.role,
//       },
//       access_token: token,
//     });
//   } catch (error: any) {
//     console.error('Registration error details:', error);
//     return res.status(500).json({
//       message: 'Server error',
//       error: error instanceof Error ? error.message : String(error),
//     });
//   }
// });
// // REGISTER ADMIN USER ENDPOINT
// router.post('/register/admin', async (req: any, res: any) => {
//   try {
//     const { username, email, password, role } = req.body;
//     console.log('Received registration request:', { username, email });

//     const existingUser = await UserModel.findOne({ email });
//     if (existingUser) {
//       return res.status(401).json({ message: 'User already exists' });
//     }

//     const hashPassword = await bcrypt.hash(password, 10);
//     const newUser = new UserModel({
//       username,
//       email,
//       password: hashPassword,
//       role,
//     });
//     await newUser.save();

//     const token = jwt.sign(
//       { id: newUser._id },
//       process.env.JWT_SECRET || 'secret',
//       { expiresIn: '1d' }
//     );

//     return res.status(201).json({
//       message: 'User created successfully',
//       user: {
//         id: newUser._id,
//         username: newUser.username,
//         email: newUser.email,
//         role: newUser.role,
//       },
//       access_token: token,
//     });
//   } catch (error: any) {
//     console.error('Registration error details:', error);
//     return res.status(500).json({
//       message: 'Server error',
//       error: error instanceof Error ? error.message : String(error),
//     });
//   }
// });

// // LOGIN ENDPOINT
// router.post('/login', async (req: any, res: any) => {
//   try {
//     const { email, password } = req.body;
//     const findUser = await UserModel.findOne({ email });

//     if (!findUser) {
//       return res.status(401).json({ message: 'Wrong credentials' });
//     }

//     const validPassword = await bcrypt.compare(password, findUser.password);
//     if (!validPassword) {
//       return res.status(401).json({ message: 'Wrong credentials' });
//     }

//     const token = jwt.sign(
//       { id: findUser._id },
//       process.env.JWT_SECRET || 'secret',
//       { expiresIn: '1d' }
//     );

//     return res.status(200).json({
//       message: 'Login successful',
//       user: {
//         id: findUser._id,
//         username: findUser.username,
//         email: findUser.email,
//         role: findUser.role,
//       },
//       access_token: token,
//     });
//   } catch (error) {
//     console.error('Login error details:', error);
//     return res.status(500).json({
//       message: 'Server error',
//       error: error instanceof Error ? error.message : String(error),
//     });
//   }
// });

// // function to generate otp
// const generateOTP = () => {
//   return crypto.randomInt(100000, 999999).toString();
// };

// // VERIFY EMAIL ENDPOINT
// router.post('/verify-email', async (req: any, res: any) => {
//   try {
//     const { email } = req.body;
//     const userEmail = await UserModel.findOne({ email });
//     // GET OTP
//     if (!userEmail) {
//       return res.status(400).json({ message: 'Email not found' });
//     }
//     const otp = generateOTP();
//     const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

//     userEmail.otp = { code: otp, expiresAt: expiresAt };
//     // create an email service that will send the otp
//     // Send OTP via email
//     const emailSent = await sendOtp(email, otp);
//     console.log({ emailSent });
//     if (!emailSent) {
//       return res.status(400).json({ message: 'Failed to send OTP email' });
//     }

//     // save otp to user document in the database
//     await userEmail.save();

//     if (!userEmail || userEmail.email !== email) {
//       res.status(400).json({ message: 'Wrong email Address provided' });
//     }
//     if (userEmail && userEmail.email === email) {
//       res.status(200).json({
//         mesaage: 'verified email successfully, Verification code sent',
//         expiresAt,
//       });
//     }
//   } catch (error) {
//     console.error('An unknown error occured:', error);
//     return res.status(500).json({
//       message: 'Server error',
//       error: error instanceof Error ? error.message : String(error),
//     });
//   }
// });

// // VERIFY OTP ENDPOINT
// router.post('/verify-otp', async (req: any, res: any) => {
//   const { username, email, otp } = req.body;
//   console.log(req, 'req');
//   console.log(username, email, otp);
//   try {
//     // this will return an object
//     const user = await UserModel.findOne({ email });
//     console.log({ user });
//     // check if the otp in the usermodel is the same as the one entered by the user
//     if (user) {
//       if (user.otp && user.otp.expiresAt < new Date()) {
//         return res.status(400).json({ message: 'OTP expired' });
//       }
//       if (user.otp && user.otp.code === otp) {
//         return res.status(200).json({
//           message: 'OTP verified successfully',
//         });
//       } else {
//         return res.status(400).json({
//           message: 'Invalid Otp',
//         });
//       }
//     } else {
//       return res.status(500).json({
//         message: 'Server error',
//       });
//     }
//   } catch (error) {
//     console.error('Otp was not verified, Recheck otp or expired otp');
//   }
// });

// // RESET PASSWORD ENDPOINT
// router.post('/reset-password', async (req: any, res: any) => {
//   try {
//     const { email, password } = req.body;
//     const hashPassword = await bcrypt.hash(password, 10);
//     const user = await UserModel.findOne({ email });
//     if (!user) {
//       res.status(400).json({
//         message: 'User does not exist',
//       });
//     }

//     // change the password of the user in the databse
//     if (user) {
//       user.password = hashPassword;
//       await user.save();

//       return res
//         .status(200)
//         .json({ message: "Changed user's password successfully" });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: 'Server error',
//       error: error instanceof Error ? error.message : String(error),
//     });
//   }
// });

// export { router as userRouter };