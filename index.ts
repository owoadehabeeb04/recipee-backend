import dotenv from 'dotenv'
dotenv.config()

import express from 'express';
import cors from 'cors'
import mongoose from 'mongoose'
import { userRouter } from './Routes/auth';
// import cookieParser from "cookie-parser"

const app = express()
const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

app.use(cors(
  {
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
))
app.use(express.json())
app.use('/auth', userRouter)

// Mongoose Connection

mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
  
  // Add connection error handler
  mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})