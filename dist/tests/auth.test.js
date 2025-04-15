"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const API_URL = process.env.API_URL || 'http://localhost:3001';
async function testAuth() {
    var _a;
    const uniqueId = Date.now();
    const testUser = {
        username: `testuser_${uniqueId}`,
        email: `test${uniqueId}@example.com`,
        password: 'Test123',
    };
    try {
        // Register
        console.log('Testing registration...');
        const registerRes = await axios_1.default.post(`${API_URL}/auth/register`, testUser);
        console.log('Register response:', registerRes.data);
        // Login
        console.log('\nTesting login...');
        const loginRes = await axios_1.default.post(`${API_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password,
        });
        console.log('Login response:', loginRes.data);
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error('Test failed:', (_a = error.response) === null || _a === void 0 ? void 0 : _a.data);
        }
    }
}
testAuth();
testAuth();
