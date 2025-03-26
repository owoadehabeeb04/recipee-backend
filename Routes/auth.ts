import express from 'express';
import {
  loginUser,
  registerAdmin,
  registerUser,
} from '../controllers/authController';
import {
  changePassword,
  resetPassword,
  verifyEmail,
  verifyOTP,
} from '../controllers/passwordController';
import { verifyToken } from '../middleware/authMIddleware';

const router = express.Router();

// User registration and authentication routes
router.post('/register', registerUser);
router.post('/register/admin', registerAdmin);
router.post('/login', loginUser);
// Password and verification
router.post('/verify-email', verifyEmail);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/change-password', verifyToken, changePassword);

export { router as userRouter };
