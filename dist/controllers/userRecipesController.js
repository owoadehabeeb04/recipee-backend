"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserRecipe = exports.editUserRecipe = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const recipe_1 = __importDefault(require("../models/recipe"));
const favoriteRecipe_1 = __importDefault(require("../models/favoriteRecipe"));
/**
 * Controller to edit a user's recipe
 */
const editUserRecipe = async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { id } = req.params;
        const userId = req.user._id;
        // Check if ID is valid MongoDB ObjectId
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid recipe ID format',
            });
        }
        // Check if recipe exists
        const recipe = await recipe_1.default.findById(id);
        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: 'Recipe not found',
            });
        }
        // Verify the user owns this recipe
        if (!recipe.user || recipe.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to edit this recipe',
            });
        }
        // Only allow specific fields to be updated
        const updateData = {};
        const allowedFields = [
            'title',
            'description',
            'category',
            'cookingTime',
            'difficulty',
            'servings',
            'ingredients',
            'steps',
            'tips',
            'featuredImage',
            'isPrivate', // Users can toggle private status
            'nutrition',
        ];
        // Handle regular fields
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });
        // Special handling for nutrition field
        if (req.body.nutrition) {
            updateData.nutrition = {
                calories: Number(((_a = req.body.nutrition) === null || _a === void 0 ? void 0 : _a.calories) || 0),
                protein: Number(((_b = req.body.nutrition) === null || _b === void 0 ? void 0 : _b.protein) || 0),
                carbs: Number(((_c = req.body.nutrition) === null || _c === void 0 ? void 0 : _c.carbs) || 0),
                fat: Number(((_d = req.body.nutrition) === null || _d === void 0 ? void 0 : _d.fat) || 0),
                fiber: Number(((_e = req.body.nutrition) === null || _e === void 0 ? void 0 : _e.fiber) || 0),
                sugar: Number(((_f = req.body.nutrition) === null || _f === void 0 ? void 0 : _f.sugar) || 0),
            };
        }
        const updatedRecipe = await recipe_1.default.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });
        return res.status(200).json({
            success: true,
            message: 'Recipe updated successfully',
            data: updatedRecipe,
        });
    }
    catch (error) {
        console.error('Error updating user recipe:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update recipe',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.editUserRecipe = editUserRecipe;
/**
 * Controller to delete a user's recipe
 */
const deleteUserRecipe = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        // Check if ID is valid MongoDB ObjectId
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid recipe ID format',
            });
        }
        // Check if recipe exists
        const recipe = await recipe_1.default.findById(id);
        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: 'Recipe not found',
            });
        }
        // Verify the user owns this recipe
        if (!recipe.user || recipe.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this recipe',
            });
        }
        // Delete the recipe
        await recipe_1.default.findByIdAndDelete(id);
        // Also remove from user's favorites if it exists there
        await favoriteRecipe_1.default.updateOne({ user: userId }, { $pull: { recipes: id } });
        return res.status(200).json({
            success: true,
            message: 'Recipe deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting user recipe:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete recipe',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.deleteUserRecipe = deleteUserRecipe;
