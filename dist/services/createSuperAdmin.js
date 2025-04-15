"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_1 = __importDefault(require("../models/user"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const createSuperAdmin = async () => {
    const password = await bcryptjs_1.default.hash('superadmin123!', 10);
    try {
        // connect to mongodb
        if (mongoose_1.default.connection.readyState === 0) {
            await mongoose_1.default.connect(process.env.MONGODB_URI || '');
            console.log('Connected to MongoDB');
        }
        await user_1.default.create({
            username: 'superadmin',
            email: 'habeebowoade8@gmail.com',
            password,
            role: 'super_admin',
        });
        console.log('superadmin created successfully');
    }
    catch (error) {
        console.error('Failed to create ');
    }
};
// (async () => {
//   await createSuperAdmin();
// })();
