"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserRecipes = exports.getSingleRecipe = exports.getYourRecentRecipes = exports.getStatistics = exports.createRecipe = exports.getAllRecipes = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const recipe_1 = __importDefault(require("../../models/recipe"));
const favoriteRecipe_1 = __importDefault(require("../../models/favoriteRecipe"));
// GET ALL RECIPES
console.log('ADMIN IOS HEREEEE!! ');
const getAllRecipes = async (req, res) => {
    var _a, _b;
    console.log('GETTING ALL RECIPES');
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // pagination to prevent bulky recipes
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        const category = req.query.category;
        const sort = req.query.sort || 'newest';
        const userRole = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) || 'public';
        // Simplify query structure
        let query = {};
        // Handle role-based visibility
        if (userRole === 'admin' || userRole === 'super_admin') {
            // Simpler query for admins - they can see all admin recipes and public user recipes
            query.$or = [
                { roleCreated: 'admin' },
                { roleCreated: 'user', isPrivate: false },
            ];
            // Only add user-specific condition if userId exists
            if (userId) {
                query.$or.push({ user: userId });
            }
        }
        else if (userRole === 'user' && userId) {
            // For logged in users
            query.$or = [
                { isPublished: true, isPrivate: false },
                { user: userId }
            ];
        }
        else {
            // For public access
            query.isPublished = true;
            query.isPrivate = false;
        }
        // Add category filter if provided
        if (category) {
            if (query.$or) {
                query = {
                    $and: [
                        { $or: query.$or },
                        { category }
                    ]
                };
            }
            else {
                query.category = category;
            }
        }
        // Add search filter if provided
        if (search) {
            const searchQuery = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            };
            if (query.$and) {
                query.$and.push(searchQuery);
            }
            else if (query.$or) {
                query = {
                    $and: [
                        { $or: query.$or },
                        searchQuery
                    ]
                };
            }
            else {
                query = searchQuery;
            }
        }
        console.log('Query:', JSON.stringify(query, null, 2));
        // Set timeout option for queries
        const options = { maxTimeMS: 20000 }; // 20 seconds timeout
        // Use Promise.all to run both queries in parallel
        const [recipes, total] = await Promise.all([
            recipe_1.default.find(query, null, options)
                .sort(getSortOptions(sort))
                .skip(skip)
                .limit(limit)
                .lean(), // Use lean() for better performance
            recipe_1.default.countDocuments(query, options)
        ]);
        console.log(`Found ${recipes.length} recipes out of ${total} total`);
        return res.status(200).json({
            success: true,
            status: 200,
            message: 'Recipes retrieved successfully',
            data: recipes,
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
            success: false,
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAllRecipes = getAllRecipes;
// Helper function to get sort options
function getSortOptions(sort) {
    switch (sort) {
        case 'oldest': return { createdAt: 1 };
        case 'title': return { title: 1 };
        case 'rating': return { averageRating: -1 };
        default: return { createdAt: -1 }; // newest by default
    }
}
// CREATE A RECIPE
const createRecipe = async (req, res) => {
    console.log('CREATE RECIPE FUNCTION CALLED');
    try {
        const { title, servings, description, difficulty, category, cookingTime, steps, ingredients, featuredImage, tips, nutrition, isPrivate = false, } = req.body;
        const userId = req.user._id;
        const userRole = req.user.role;
        console.log('User role:', userRole);
        console.log('User ID:', userId);
        // Handle nutrition data
        const nutritionData = {
            calories: Number((nutrition === null || nutrition === void 0 ? void 0 : nutrition.calories) || 0),
            protein: Number((nutrition === null || nutrition === void 0 ? void 0 : nutrition.protein) || 0),
            carbs: Number((nutrition === null || nutrition === void 0 ? void 0 : nutrition.carbs) || 0),
            fat: Number((nutrition === null || nutrition === void 0 ? void 0 : nutrition.fat) || 0),
            fiber: Number((nutrition === null || nutrition === void 0 ? void 0 : nutrition.fiber) || 0),
            sugar: Number((nutrition === null || nutrition === void 0 ? void 0 : nutrition.sugar) || 0)
        };
        // Start with base recipe data
        const baseRecipeData = {
            title,
            description,
            category,
            cookingTime,
            difficulty: difficulty || 'medium',
            servings,
            ingredients,
            steps,
            featuredImage: featuredImage || '',
            tips,
            nutrition: nutritionData,
            isPrivate: userRole === 'admin' ? false : (isPrivate || false),
            isPublished: false,
            roleCreated: userRole
        };
        // Create the final recipe data with proper type
        let recipeData;
        if (userRole === 'admin' || userRole === 'super_admin') {
            recipeData = {
                ...baseRecipeData,
                admin: userId,
                adminId: userId,
                adminDetails: {
                    name: req.user.username || req.user.name,
                    email: req.user.email,
                    role: req.user.role
                }
            };
            console.log('Added admin fields');
        }
        else {
            recipeData = {
                ...baseRecipeData,
                user: userId,
                userDetails: {
                    name: req.user.username || req.user.name,
                    email: req.user.email,
                    role: req.user.role
                }
            };
            console.log('Added user field');
        }
        console.log('Recipe data prepared:', JSON.stringify(recipeData, null, 2));
        // Create and save the recipe
        const newRecipe = new recipe_1.default(recipeData);
        const savedRecipe = await newRecipe.save();
        console.log('Recipe saved successfully with ID:', savedRecipe._id);
        // If the recipe creator is a regular user (not an admin), add to favorites
        if (userRole === 'user') {
            try {
                // Check if the user already has a favorites document
                let userFavorites = await favoriteRecipe_1.default.findOne({ user: userId });
                if (!userFavorites) {
                    // If user doesn't have favorites document yet, create one
                    userFavorites = new favoriteRecipe_1.default({
                        user: userId,
                        recipes: [savedRecipe._id]
                    });
                    await userFavorites.save();
                    console.log(`Created new favorites document for user ${userId} and added recipe ${savedRecipe._id}`);
                }
                else {
                    // If favorites document exists, add the recipe to it
                    if (!userFavorites.recipe.includes(savedRecipe._id)) {
                        userFavorites.recipe.push(savedRecipe._id);
                        await userFavorites.save();
                        console.log(`Added recipe ${savedRecipe._id} to user ${userId}'s favorites`);
                    }
                }
            }
            catch (favError) {
                // Don't fail the whole request if adding to favorites fails
                console.error('Error adding recipe to favorites:', favError);
                // We'll still return success since the recipe was created
            }
        }
        return res.status(201).json({
            success: true,
            message: 'Recipe created!',
            data: savedRecipe,
        });
    }
    catch (error) {
        console.error('Error creating recipe:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create recipe',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
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
    var _a, _b;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const userRole = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) || 'public'; // Default to 'public' if not logged in
        console.log(`Getting recipe ${id} for user ${userId} with role ${userRole}`);
        // Validate ObjectId format
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid recipe ID format'
            });
        }
        const recipe = await recipe_1.default.findById(id);
        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: 'Recipe not found',
            });
        }
        // Check access permissions:
        // 1. Admins can see any recipe
        // 2. Users can see:
        //    - Any published recipe 
        //    - Their own recipes (published or not)
        // 3. Public users can only see published recipes
        if (userRole === 'admin' || userRole === 'super_admin') {
            // Admins can see everything
            console.log('Admin access - showing recipe');
        }
        else if (userRole === 'user') {
            // For regular users:
            const isOwnRecipe = recipe.user && recipe.user.toString() === (userId === null || userId === void 0 ? void 0 : userId.toString());
            if (!recipe.isPublished && !isOwnRecipe) {
                console.log('Access denied - recipe not published and not owned by this user');
                return res.status(403).json({
                    success: false,
                    message: 'This recipe is not yet published',
                });
            }
            console.log(`User access - ${isOwnRecipe ? 'showing own recipe' : 'showing published recipe'}`);
        }
        else {
            // Public access
            if (!recipe.isPublished || recipe.isPrivate) {
                console.log('Public access denied - recipe not published or is private');
                return res.status(403).json({
                    success: false,
                    message: 'This recipe is not available',
                });
            }
            console.log('Public access - showing published recipe');
        }
        return res.status(200).json({
            success: true,
            message: 'Recipe retrieved successfully',
            data: recipe,
            // Include an indicator if this is the user's own recipe
            isOwnRecipe: userRole === 'user' && recipe.user && recipe.user.toString() === (userId === null || userId === void 0 ? void 0 : userId.toString())
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
// GET ALL USER RECIPES
const getUserRecipes = async (req, res) => {
    try {
        const userId = req.user._id;
        // pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Find recipes where the user is the creator
        const query = { user: userId };
        // Count total
        const total = await recipe_1.default.countDocuments(query);
        // Get recipes
        const recipes = await recipe_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        return res.status(200).json({
            success: true,
            message: 'Your recipes retrieved successfully',
            data: recipes,
            pagination: {
                limit,
                page,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Error getting user recipes:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error instanceof Error ? error.message : 'An unknown error occurred',
        });
    }
};
exports.getUserRecipes = getUserRecipes;
