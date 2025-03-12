import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testAuth() {
  const uniqueId = Date.now();
  const testUser = {
    username: `testuser_${uniqueId}`,
    email: `test${uniqueId}@example.com`,
    password: 'Test123',
  };

  try {
    // Register
    console.log('Testing registration...');
    const registerRes = await axios.post(`${API_URL}/auth/register`, testUser);
    console.log('Register response:', registerRes.data);

    // Login
    console.log('\nTesting login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password,
    });
    console.log('Login response:', loginRes.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Test failed:', error.response?.data);
    }
  }
}

testAuth();
testAuth();
