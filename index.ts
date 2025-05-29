import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { userRouter } from './Routes/auth';
import { RecipeRouter } from './Routes/recipe';
import { UserRouter } from './Routes/user';
import { FavoriteRouter } from './Routes/favorites';
import { MealPlanRouter } from './Routes/meal-planner';
import { AIChatbotRouter } from './Routes/AIChatBot';
import { reviewRouter } from './Routes/review';
import { recipeInterractionRouter } from './Routes/recipeInterraction';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PRODUCTION_URL = 'https://recipe-app-kappa-cyan.vercel.app';
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

// CORS Configuration
app.use(
  cors({
    origin: [FRONTEND_URL, PRODUCTION_URL],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', userRouter);
app.use('/recipes', RecipeRouter);
app.use('/users', UserRouter);
app.use('/favorites', FavoriteRouter);
app.use('/meal-planner', MealPlanRouter);
app.use('/chatbot', AIChatbotRouter);
app.use('/reviews', reviewRouter);
app.use('/cooking', recipeInterractionRouter);

// MongoDB Connection with improved settings
const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 20000, // Increased timeout
      socketTimeoutMS: 45000,
      retryWrites: true,
      maxPoolSize: 10,
      w: 'majority',
      // Remove tlsInsecure for production
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connection event handlers
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Connect to database
connectDB();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});