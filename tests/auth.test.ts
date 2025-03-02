import axios from 'axios';
import dotenv from "dotenv";
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testAuth() {
  try {
    // Register
    console.log('Testing registration...');
    const registerRes = await axios.post(`${API_URL}/auth/register`, {
      username: 'testuser',
      email: 'test@examplee.com',
      password: 'Test123'
    });
    console.log('Register response:', registerRes.data);

    // Login
    console.log('\nTesting login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'Test123'
    });
    console.log('Login response:', loginRes.data);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Test failed:', error);
    }
  }
}

testAuth();