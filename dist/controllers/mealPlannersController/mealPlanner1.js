"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.duplicateMealPlan = exports.deleteMealPlan = exports.updateMealPlan = exports.getMealPlanByWeek = exports.getMealPlan = exports.getUserMealPlans = exports.createMealPlan = void 0;
exports.formatDate = formatDate;
const mongoose_1 = __importDefault(require("mongoose"));
const recipe_1 = __importDefault(require("../../models/recipe"));
const meal_planner_1 = __importDefault(require("../../models/meal-planner"));
const mealplanner_1 = require("./mealplanner");
/**
 * Create a new meal plan
 */
const createMealPlan = async (req, res) => {
    try {
        const { name, week, plan, notes } = req.body;
        const userId = req.user._id;
        // Validate week format
        if (!Date.parse(week)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid week format, please provide a valid date'
            });
        }
        const weekDate = new Date(week);
        const dayOfWeek = weekDate.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        // Set to the beginning of the week (Monday)
        weekDate.setDate(weekDate.getDate() - diff);
        weekDate.setHours(0, 0, 0, 0);
        // Set to the end of the week (Sunday)
        const endOfWeek = new Date(weekDate);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        // Check if user already has a meal plan for this week
        const existingPlan = await meal_planner_1.default.findOne({
            user: userId,
            week: {
                $gte: weekDate,
                $lte: endOfWeek
            }
        });
        if (existingPlan) {
            return res.status(409).json({
                success: false,
                message: 'You already have a meal plan for this week',
                existingPlan: {
                    id: existingPlan._id,
                    name: existingPlan.name,
                    week: existingPlan.week
                }
            });
        }
        // Check if all recipe IDs exist and are accessible to the user
        const recipeIds = (0, mealplanner_1.extractRecipeIds)(plan);
        if (recipeIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No recipe IDs provided in the meal plan'
            });
        }
        // Fetch detailed recipe information to embed in the meal plan
        const recipes = await recipe_1.default.find({
            _id: { $in: recipeIds },
            $or: [
                { isPublished: true, isPrivate: false },
                { user: userId }
            ]
        });
        // Create a map for quick recipe lookup
        const recipeMap = recipes.reduce((acc, recipe) => {
            acc[recipe._id.toString()] = recipe;
            return acc;
        }, {});
        // Verify all recipes exist and are accessible
        if (recipes.length !== recipeIds.length) {
            return res.status(400).json({
                success: false,
                message: 'One or more recipes do not exist or are not accessible'
            });
        }
        // Embed recipe details in the plan
        const enrichedPlan = (0, mealplanner_1.embedRecipeDetails)(plan, recipeMap);
        // Create the meal plan with the enriched plan containing recipe details
        const mealPlan = new meal_planner_1.default({
            name,
            week: weekDate, // Use the standardized Monday date
            plan: enrichedPlan, // Use the enriched plan with recipe details
            notes,
            user: userId,
        });
        await mealPlan.save();
        return res.status(201).json({
            success: true,
            message: 'Meal plan created successfully',
            data: mealPlan
        });
    }
    catch (error) {
        console.error('Error creating meal plan:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create meal plan',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createMealPlan = createMealPlan;
/**
 * Get all meal plans for the authenticated user
 */
const getUserMealPlans = async (req, res) => {
    try {
        const userId = req.user._id;
        const { limit = 10, page = 1, active } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        // Build query
        const query = { user: userId };
        // Filter by active status if specified
        if (active !== undefined) {
            query.isActive = active === 'true';
        }
        // Get meal plans with pagination
        const mealPlans = await meal_planner_1.default.find(query)
            .sort({ week: -1 }) // Latest week first
            .skip(skip)
            .limit(Number(limit));
        // Get total count for pagination
        const total = await meal_planner_1.default.countDocuments(query);
        return res.status(200).json({
            success: true,
            message: 'Meal plans retrieved successfully',
            data: mealPlans,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error getting meal plans:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve meal plans',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getUserMealPlans = getUserMealPlans;
const getMealPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        // Validate ObjectId
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid meal plan ID'
            });
        }
        // Get the meal plan
        const mealPlan = await meal_planner_1.default.findOne({ _id: id, user: userId });
        if (!mealPlan) {
            return res.status(404).json({
                success: false,
                message: 'Meal plan not found'
            });
        }
        // Get all recipe IDs from the plan
        const recipeIds = (0, mealplanner_1.extractRecipeIds)(mealPlan.plan);
        // Get detailed recipe information
        const recipes = await recipe_1.default.find({
            _id: { $in: recipeIds }
        });
        // Create a map for quick recipe lookup
        const recipeMap = recipes.reduce((acc, recipe) => {
            acc[recipe._id.toString()] = recipe;
            return acc;
        }, {});
        // Enrich the plan with recipe details
        const enrichedPlan = (0, mealplanner_1.enrichPlanWithRecipes)(mealPlan.plan, recipeMap);
        console.log({ enrichedPlan });
        // Create response object
        const response = {
            ...mealPlan.toObject(),
            plan: enrichedPlan
        };
        return res.status(200).json({
            success: true,
            message: 'Meal plan retrieved successfully',
            data: response
        });
    }
    catch (error) {
        console.error('Error getting meal plan:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve meal plan',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getMealPlan = getMealPlan;
const getMealPlanByWeek = async (req, res) => {
    try {
        const { date } = req.params;
        const userId = req.user._id;
        if (!date || !Date.parse(date)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format, please provide a valid date (YYYY-MM-DD)'
            });
        }
        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - diff);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        // Find the meal plan for this week
        const mealPlan = await meal_planner_1.default.findOne({
            user: userId,
            week: {
                $gte: weekStart,
                $lte: weekEnd
            }
        });
        if (!mealPlan) {
            return res.status(404).json({
                success: false,
                message: 'No meal plan found for the specified week',
                weekRange: {
                    start: weekStart,
                    end: weekEnd
                }
            });
        }
        // Get all recipe IDs from the plan
        const recipeIds = (0, mealplanner_1.extractRecipeIds)(mealPlan.plan);
        // Get detailed recipe information
        const recipes = await recipe_1.default.find({
            _id: { $in: recipeIds }
        });
        console.log({ recipes });
        // Create a map for quick recipe lookup
        const recipeMap = recipes.reduce((acc, recipe) => {
            acc[recipe._id.toString()] = recipe;
            return acc;
        }, {});
        // Enrich the plan with recipe details
        const enrichedPlan = (0, mealplanner_1.enrichPlanWithRecipes)(mealPlan.plan, recipeMap);
        // Create response object with week range information
        const response = {
            ...mealPlan.toObject(),
            plan: enrichedPlan,
            weekRange: {
                start: weekStart,
                end: weekEnd,
                formattedRange: `${formatDate(weekStart)} to ${formatDate(weekEnd)}`
            }
        };
        return res.status(200).json({
            success: true,
            message: 'Meal plan retrieved successfully',
            data: response
        });
    }
    catch (error) {
        console.error('Error getting meal plan by week:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve meal plan',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getMealPlanByWeek = getMealPlanByWeek;
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;
    return [year, month, day].join('-');
}
/**
 * Update a meal plan
 */
const updateMealPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, week, plan, notes, isActive } = req.body;
        const userId = req.user._id;
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid meal plan ID'
            });
        }
        // Find the meal plan
        const mealPlan = await meal_planner_1.default.findOne({ _id: id, user: userId });
        if (!mealPlan) {
            return res.status(404).json({
                success: false,
                message: 'Meal plan not found'
            });
        }
        // Update fields if provided
        if (name)
            mealPlan.name = name;
        if (week) {
            if (!Date.parse(week)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid week format, please provide a valid date'
                });
            }
            mealPlan.week = new Date(week);
        }
        // Update plan if provided
        if (plan) {
            const recipeIds = (0, mealplanner_1.extractRecipeIds)(plan);
            if (recipeIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No recipe IDs provided in the meal plan'
                });
            }
            // Verify recipes exist and are accessible
            const validRecipes = await recipe_1.default.countDocuments({
                _id: { $in: recipeIds },
                $or: [
                    { isPublished: true, isPrivate: false },
                    { user: userId }
                ]
            });
            if (validRecipes !== recipeIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more recipes do not exist or are not accessible'
                });
            }
            // Important note: This assigns the new plan object, but preserves any existing meals
            // by merging the new plan with the existing one
            if (typeof plan === 'object') {
                // Here's where we ensure we're not losing any meals during partial updates
                const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
                // Create a deep copy of the current plan to start with
                const updatedPlan = JSON.parse(JSON.stringify(mealPlan.plan || {}));
                // Update only the days and meal types provided in the new plan
                days.forEach(day => {
                    if (plan[day]) {
                        if (!updatedPlan[day]) {
                            updatedPlan[day] = {};
                        }
                        mealTypes.forEach(mealType => {
                            if (plan[day][mealType]) {
                                updatedPlan[day][mealType] = plan[day][mealType];
                            }
                        });
                    }
                });
                mealPlan.plan = updatedPlan;
            }
            else {
                mealPlan.plan = plan;
            }
        }
        if (notes !== undefined)
            mealPlan.notes = notes;
        if (isActive !== undefined)
            mealPlan.isActive = isActive;
        // Save the updated meal plan
        await mealPlan.save();
        // Get the updated meal plan with all fields from the database
        const updatedMealPlan = await meal_planner_1.default.findById(mealPlan._id);
        // Return the complete updated meal plan
        return res.status(200).json({
            success: true,
            message: 'Meal plan updated successfully',
            data: updatedMealPlan
        });
    }
    catch (error) {
        console.error('Error updating meal plan:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update meal plan',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateMealPlan = updateMealPlan;
/**
 * Delete a meal plan
 */
const deleteMealPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        // Validate ObjectId
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid meal plan ID'
            });
        }
        // Delete the meal plan
        const result = await meal_planner_1.default.deleteOne({ _id: id, user: userId });
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Meal plan not found or you do not have permission to delete it'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Meal plan deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting meal plan:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete meal plan',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteMealPlan = deleteMealPlan;
/**
 * Duplicate an existing meal plan to a new week
 */
const duplicateMealPlan = async (req, res) => {
    try {
        const { id } = req.params; // ID of the meal plan to duplicate
        const { targetWeek, name, notes } = req.body;
        const userId = req.user._id;
        // Validate ObjectId
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid meal plan ID'
            });
        }
        // Validate target week (required parameter)
        if (!targetWeek || !Date.parse(targetWeek)) {
            return res.status(400).json({
                success: false,
                message: 'Target week is required and must be a valid date'
            });
        }
        // Find the source meal plan
        const sourceMealPlan = await meal_planner_1.default.findOne({ _id: id, user: userId });
        if (!sourceMealPlan) {
            return res.status(404).json({
                success: false,
                message: 'Source meal plan not found'
            });
        }
        // Normalize target week to start of week (Monday)
        const targetWeekDate = new Date(targetWeek);
        const dayOfWeek = targetWeekDate.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        targetWeekDate.setDate(targetWeekDate.getDate() - diff);
        targetWeekDate.setHours(0, 0, 0, 0);
        // Check if user already has a meal plan for the target week
        const endOfWeek = new Date(targetWeekDate);
        endOfWeek.setDate(targetWeekDate.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        const existingPlan = await meal_planner_1.default.findOne({
            user: userId,
            week: {
                $gte: targetWeekDate,
                $lte: endOfWeek
            }
        });
        if (existingPlan) {
            return res.status(409).json({
                success: false,
                message: 'You already have a meal plan for the target week',
                existingPlan: {
                    id: existingPlan._id,
                    name: existingPlan.name,
                    week: existingPlan.week
                }
            });
        }
        // Get all recipe IDs from the source plan
        const recipeIds = (0, mealplanner_1.extractRecipeIds)(sourceMealPlan.plan);
        // Check if all recipes still exist and are accessible
        if (recipeIds.length > 0) {
            const recipes = await recipe_1.default.find({
                _id: { $in: recipeIds },
                $or: [
                    { isPublished: true, isPrivate: false },
                    { user: userId }
                ]
            });
            if (recipes.length !== recipeIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more recipes in the source meal plan are no longer accessible'
                });
            }
            // Create a map for quick recipe lookup
            const recipeMap = recipes.reduce((acc, recipe) => {
                acc[recipe._id.toString()] = recipe;
                return acc;
            }, {});
            // Create the new meal plan
            const newMealPlan = new meal_planner_1.default({
                name: name || `Copy of ${sourceMealPlan.name}`, // Use provided name or generate one
                week: targetWeekDate,
                plan: JSON.parse(JSON.stringify(sourceMealPlan.plan)), // Deep copy the plan structure
                notes: notes !== undefined ? notes : sourceMealPlan.notes, // Use provided notes or copy from source
                user: userId,
                isActive: true,
                isDuplicate: true // Mark as duplicate
            });
            // Save the new meal plan
            await newMealPlan.save();
            // Return response similar to createMealPlan
            return res.status(201).json({
                success: true,
                message: 'Meal plan duplicated successfully',
                data: newMealPlan
            });
        }
        else {
            // Handle case where source plan has no recipes
            const newMealPlan = new meal_planner_1.default({
                name: name || `Copy of ${sourceMealPlan.name}`,
                week: targetWeekDate,
                plan: {}, // Empty plan if source has no recipes
                notes: notes !== undefined ? notes : sourceMealPlan.notes,
                user: userId,
                isActive: true,
                isDuplicate: true
            });
            await newMealPlan.save();
            return res.status(201).json({
                success: true,
                message: 'Meal plan duplicated successfully (no recipes found in source plan)',
                data: newMealPlan
            });
        }
    }
    catch (error) {
        console.error('Error duplicating meal plan:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to duplicate meal plan',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.duplicateMealPlan = duplicateMealPlan;
