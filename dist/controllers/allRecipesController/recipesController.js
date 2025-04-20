"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSingleRecipe = exports.getYourRecentRecipes = exports.getStatistics = exports.createRecipe = exports.getAllRecipes = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const recipe_1 = __importDefault(require("../../models/recipe"));
const user_1 = __importDefault(require("../../models/user"));
// GET ALL RECIPES
console.log('ADMIN IOS HEREEEE!! ');
const getAllRecipes = async (req, res) => {
    var _a;
    console.log('GOTTEN ALL RECIPES DONT PLAY MAN!');
    try {
        // pagination to prevent bulky recipes
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Get search and category from query string
        const search = req.query.search;
        const category = req.query.category;
        const sort = req.query.sort || 'newest';
        // Improve role detection
        const hasValidAuth = !!req.user;
        const userRole = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) || 'user';
        // Build query object
        let query = {};
        // Only filter by isPublished if the user isn't an admin
        if (!hasValidAuth || userRole === 'user') {
            query.isPublished = true;
            console.log('Filtering for published recipes only');
        }
        else {
            console.log('Admin access - showing all recipes');
        }
        // Add other filters
        if (category) {
            query.category = category;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }
        // Count the total number of matching recipes
        const total = await recipe_1.default.countDocuments(query);
        let sortOptions = {};
        switch (sort) {
            case 'oldest':
                sortOptions = { createdAt: 1 };
                break;
            case 'title':
                sortOptions = { title: 1 };
                break;
            case 'rating':
                sortOptions = { averageRating: -1 };
                break;
            default:
                sortOptions = { createdAt: -1 }; // newest by default
        }
        console.log('Sorting by:', sort);
        const recipes = await recipe_1.default.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);
        console.log('Recipes found:', recipes.length);
        return res.status(200).json({
            message: 'Gotten recipes successfully',
            data: recipes,
            status: 200,
            pagination: {
                limit,
                page,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Error in getAllRecipes:', error);
        return res.status(500).json({
            message: 'server error',
        });
    }
};
exports.getAllRecipes = getAllRecipes;
// CREATE A RECIPE
const createRecipe = async (req, res) => {
    var _a;
    console.log('GOTTEN THE CREATE RECIPE MAN !!!! ALHAMDULILLAH');
    try {
        console.log('REQUEST BODY:', JSON.stringify(req.body, null, 2));
        const { title, servings, description, difficulty, category, cookingTime, steps, ingredients, featuredImage, tips, nutrition, } = req.body;
        console.log('request body', req.body);
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        let formattedAdminId;
        try {
            // If adminId is a string, convert it to ObjectId
            formattedAdminId =
                typeof adminId === 'string'
                    ? new mongoose_1.default.Types.ObjectId(adminId)
                    : adminId;
        }
        catch (err) {
            console.error('Error converting admin ID:', err);
            return res.status(400).json({
                success: false,
                message: 'Invalid admin ID format',
            });
        }
        // Get complete admin details from database with proper error handling
        const adminDetail = await user_1.default.findById(formattedAdminId);
        // Debug the admin details result
        if (adminDetail) {
            console.log('Admin name:', adminDetail.username);
        }
        if (!adminDetail) {
            return res.status(404).json({
                success: false,
                message: 'Admin user not found',
            });
        }
        console.log(nutrition, 'nutrtion');
        const nutritionData = {
            calories: Number((nutrition === null || nutrition === void 0 ? void 0 : nutrition.calories) || 0),
            protein: Number((nutrition === null || nutrition === void 0 ? void 0 : nutrition.protein) || 0),
            carbs: Number((nutrition === null || nutrition === void 0 ? void 0 : nutrition.carbs) || 0),
            fat: Number((nutrition === null || nutrition === void 0 ? void 0 : nutrition.fat) || 0),
            fiber: Number((nutrition === null || nutrition === void 0 ? void 0 : nutrition.fiber) || 0),
            sugar: Number((nutrition === null || nutrition === void 0 ? void 0 : nutrition.sugar) || 0)
        };
        const newRecipe = new recipe_1.default({
            admin: adminDetail._id,
            adminDetails: {
                name: adminDetail.username,
                email: adminDetail.email,
                role: adminDetail.role,
            },
            adminId,
            title,
            description,
            category,
            cookingTime,
            difficulty: difficulty || 'medium',
            servings,
            ingredients,
            steps,
            featuredImage: featuredImage || '',
            isPublished: false,
            tips,
            nutrition: nutritionData,
        });
        const savedRecipe = await newRecipe.save();
        console.log('saved recipe', savedRecipe);
        // Debug the saved recipe
        // console.log("Saved recipe admin field:", savedRecipe.admin);
        // console.log("Saved recipe adminDetails:", savedRecipe.adminDetails);
        return res.status(201).json({
            success: true,
            message: 'Recipe created!',
            data: savedRecipe,
        });
    }
    catch (error) {
        console.log(error);
        return res
            .status(500)
            .json({ message: 'Failed to create recipe, An unknown error occured ' });
    }
};
exports.createRecipe = createRecipe;
// GET RECIPE STATISTICS
const getStatistics = async (req, res) => {
    var _a;
    console.log('get statistics i pray it gets here ');
    try {
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const allRecipes = await recipe_1.default.countDocuments();
        const myRecipes = await recipe_1.default.countDocuments({ adminId });
        const publishedRecipes = await recipe_1.default.countDocuments({
            adminId,
            isPublished: true,
        });
        const unpublishedRecipes = myRecipes - publishedRecipes;
        return res.status(200).json({
            success: true,
            data: {
                allRecipes,
                myRecipes,
                publishedRecipes,
                unpublishedRecipes,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getStatistics = getStatistics;
// get recent recipes data
const getYourRecentRecipes = async (req, res) => {
    var _a;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const query = { adminId: adminId };
        const recipes = await recipe_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        return res.status(200).json({
            success: true,
            message: 'Your recipes retrieved successfully',
            data: recipes.slice(0, 3),
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getYourRecentRecipes = getYourRecentRecipes;
// GET A SINGLE RECIPE BY ID
const getSingleRecipe = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const userRole = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) || 'user';
        const recipe = await recipe_1.default.findById(id);
        console.log({ recipe });
        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: 'Recipe not found',
            });
        }
        if (userRole === 'user' && recipe.isPublished === false) {
            return res.status(403).json({
                success: false,
                message: 'This recipe is not yet published',
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Recipe retrieved successfully',
            data: recipe,
        });
    }
    catch (error) {
        console.error('Error fetching recipe:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getSingleRecipe = getSingleRecipe;
