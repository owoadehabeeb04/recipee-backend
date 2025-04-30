"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFavoriteStatus = exports.getAllFavorites = exports.removeFavorite = exports.addToFavorites = void 0;
const favoriteRecipe_1 = __importDefault(require("../../models/favoriteRecipe"));
const recipe_1 = __importDefault(require("../../models/recipe"));
const addToFavorites = async (req, res) => {
    try {
        const { recipeId } = req.body;
        const userId = req.user._id;
        const existingFavorite = await favoriteRecipe_1.default.findOne({
            user: userId,
            recipe: recipeId,
        });
        if (existingFavorite) {
            return res.status(400).json({
                success: false,
                message: 'Recipe already in favorites',
            });
        }
        const recipeExists = await recipe_1.default.exists({ _id: recipeId });
        if (!recipeExists) {
            return res.status(404).json({
                success: false,
                message: 'Recipe not found',
            });
        }
        const newFavorite = new favoriteRecipe_1.default({
            user: userId,
            recipe: recipeId,
        });
        await newFavorite.save();
        return res.status(201).json({
            success: true,
            message: 'Recipe added to favorites',
            data: newFavorite,
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Recipe already in favorites',
            });
        }
        console.error('Error in addToFavorite:', error);
        return res.status(500).json({
            message: 'server error',
        });
    }
};
exports.addToFavorites = addToFavorites;
const removeFavorite = async (req, res) => {
    try {
        const { recipeId } = req.params;
        const userId = req.user._id;
        const favoriteExists = await favoriteRecipe_1.default.findOne({
            user: userId,
            recipe: recipeId,
        });
        if (!favoriteExists) {
            return res.status(400).json({
                success: false,
                message: 'This recipe has not been added to your favorites',
            });
        }
        const result = await favoriteRecipe_1.default.findOneAndDelete({
            user: userId,
            recipe: recipeId,
        });
        if (!result) {
            return res.status(400).json({
                success: false,
                message: 'Recipe not found in favorites',
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Recipe removed from favorites',
        });
    }
    catch (error) {
        console.error('Error in remove favorite:', error);
        return res.status(500).json({
            message: 'server error',
        });
    }
};
exports.removeFavorite = removeFavorite;
const getAllFavorites = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        const category = req.query.category;
        const sort = req.query.sort || 'newest';
        const query = { user: userId };
        if (search || category) {
            const recipeQuery = {};
            if (category) {
                recipeQuery.category = category;
            }
            // Add search filter to recipe query if provided
            if (search) {
                recipeQuery.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                ];
            }
            // Find all recipe IDs that match our criteria
            const matchingRecipes = await recipe_1.default.find(recipeQuery).select('_id');
            // Extract just the IDs
            const recipeIds = matchingRecipes.map((recipe) => recipe._id);
            // If we have matching recipes, add them to our favorites query
            if (recipeIds.length > 0) {
                // Only include favorites with these recipe IDs
                query.recipe = { $in: recipeIds };
            }
            else {
                // No recipes match our criteria, so return empty result
                return res.status(200).json({
                    success: true,
                    status: 200,
                    message: 'No favorites match the search criteria',
                    data: [],
                    pagination: {
                        limit,
                        page,
                        total: 0,
                        pages: 0,
                    },
                });
            }
        }
        // Count the total number of matching favorites with our updated query
        const total = await favoriteRecipe_1.default.countDocuments(query);
        // Set up sorting options
        let sortOptions = {};
        switch (sort) {
            case 'oldest':
                sortOptions = { createdAt: 1 };
                break;
            // We'll handle title and rating sorting after population
            default:
                sortOptions = { createdAt: -1 }; // newest by default
        }
        // Get favorites with populated recipe and user data
        const favoriteRecipes = await favoriteRecipe_1.default.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .populate('recipe') // Get all recipe data
            .populate({
            path: 'user',
            select: 'username email',
        });
        // Handle sorting that requires populated data
        let sortedFavorites = [...favoriteRecipes];
        if (sort === 'title' && sortedFavorites.length > 0) {
            sortedFavorites.sort((a, b) => {
                var _a, _b;
                return ((_a = a.recipe) === null || _a === void 0 ? void 0 : _a.title.localeCompare((_b = b.recipe) === null || _b === void 0 ? void 0 : _b.title)) || 0;
            });
        }
        else if (sort === 'rating' && sortedFavorites.length > 0) {
            // sortedFavorites.sort((a, b) => {
            //   const ratingA = a.recipe?.averageRating || 0;
            //   const ratingB = b.recipe?.averageRating || 0;
            //   return ratingB - ratingA; // Higher ratings first
            // });
        }
        return res.status(200).json({
            success: true,
            message: 'Favorite recipes retrieved successfully',
            data: sortedFavorites,
            pagination: {
                limit,
                page,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Error in getAllFavorites:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
exports.getAllFavorites = getAllFavorites;
const checkFavoriteStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const { recipeId } = req.params;
        const favorite = await favoriteRecipe_1.default.findOne({
            user: userId,
            recipe: recipeId,
        });
        return res.status(200).json({
            success: true,
            isFavorited: !!favorite,
        });
    }
    catch (error) {
        console.error('Error checking favorite status:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
exports.checkFavoriteStatus = checkFavoriteStatus;
