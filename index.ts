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
// import cookieParser from "cookie-parser"

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PRODUCTION_URL = 'https://recipe-app-kappa-cyan.vercel.app';
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

app.use(
  cors({
    origin: [FRONTEND_URL, PRODUCTION_URL],
    // origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/auth', userRouter);
app.use('/recipes', RecipeRouter);
app.use('/users', UserRouter);
app.use('/favorites', FavoriteRouter);
app.use('/meal-planner', MealPlanRouter);
app.use('/chatbot', AIChatbotRouter)
// Mongoose Connection

if (!mongoUri) {
  throw new Error('MONGODB_URI is not defined');
}


mongoose
  .connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4, // Force IPv4
    retryWrites: true,
    maxPoolSize: 10,
    w: 'majority',
    tlsInsecure: true, // Only for development
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
