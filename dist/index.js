"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_1 = require("./Routes/auth");
const recipe_1 = require("./Routes/recipe");
const user_1 = require("./Routes/user");
const favorites_1 = require("./Routes/favorites");
const meal_planner_1 = require("./Routes/meal-planner");
const AIChatBot_1 = require("./Routes/AIChatBot");
// import cookieParser from "cookie-parser"
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PRODUCTION_URL = 'https://recipe-app-kappa-cyan.vercel.app';
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
}
app.use((0, cors_1.default)({
    origin: [FRONTEND_URL, PRODUCTION_URL],
    // origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/auth', auth_1.userRouter);
app.use('/recipes', recipe_1.RecipeRouter);
app.use('/users', user_1.UserRouter);
app.use('/favorites', favorites_1.FavoriteRouter);
app.use('/meal-planner', meal_planner_1.MealPlanRouter);
app.use('/chatbot', AIChatBot_1.AIChatbotRouter);
// Mongoose Connection
if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined');
}
mongoose_1.default
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
mongoose_1.default.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
