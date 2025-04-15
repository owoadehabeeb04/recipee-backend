"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const passwordController_1 = require("../controllers/passwordController");
const authMIddleware_1 = require("../middleware/authMIddleware");
const router = express_1.default.Router();
exports.userRouter = router;
// User registration and authentication routes
router.post('/register', authController_1.registerUser);
router.post('/register/admin', authController_1.registerAdmin);
router.post('/login', authController_1.loginUser);
// Password and verification
router.post('/verify-email', passwordController_1.verifyEmail);
router.post('/verify-otp', passwordController_1.verifyOTP);
router.post('/reset-password', passwordController_1.resetPassword);
router.post('/change-password', authMIddleware_1.verifyToken, passwordController_1.changePassword);
