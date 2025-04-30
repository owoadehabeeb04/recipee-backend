"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMealPlan = exports.updateMealPlan = exports.getMealPlanByWeek = exports.getMealPlan = exports.getUserMealPlans = exports.createMealPlan = void 0;
exports.extractRecipeIds = extractRecipeIds;
exports.enrichPlanWithRecipes = enrichPlanWithRecipes;
const mongoose_1 = __importDefault(require("mongoose"));
const recipe_1 = __importDefault(require("../../models/recipe"));
const meal_planner_1 = __importDefault(require("../../models/meal-planner"));
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
        const recipeIds = extractRecipeIds(plan);
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
        const enrichedPlan = embedRecipeDetails(plan, recipeMap);
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
/**
 * Get a single meal plan with recipe details
 */
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
        const recipeIds = extractRecipeIds(mealPlan.plan);
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
        const enrichedPlan = enrichPlanWithRecipes(mealPlan.plan, recipeMap);
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
        const recipeIds = extractRecipeIds(mealPlan.plan);
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
        const enrichedPlan = enrichPlanWithRecipes(mealPlan.plan, recipeMap);
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
/**
 * Format date to YYYY-MM-DD
 */
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
 * Update an existing meal plan
 */
const updateMealPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, week, plan, notes, isActive } = req.body;
        const userId = req.user._id;
        // Validate ObjectId
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
            const recipeIds = extractRecipeIds(plan);
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
            mealPlan.plan = plan;
        }
        if (notes !== undefined)
            mealPlan.notes = notes;
        if (isActive !== undefined)
            mealPlan.isActive = isActive;
        // Save the updated meal plan
        await mealPlan.save();
        return res.status(200).json({
            success: true,
            message: 'Meal plan updated successfully',
            data: mealPlan
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
 * Helper function to extract recipe IDs from a meal plan
 */
function extractRecipeIds(plan) {
    const recipeIds = new Set();
    // For each day of the week
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    days.forEach(day => {
        const dayPlan = plan[day];
        if (!dayPlan)
            return;
        // For each meal type
        mealTypes.forEach(mealType => {
            var _a;
            if ((_a = dayPlan[mealType]) === null || _a === void 0 ? void 0 : _a.recipe) {
                recipeIds.add(dayPlan[mealType].recipe.toString());
            }
        });
    });
    return Array.from(recipeIds);
}
/**
 * Helper function to enrich a meal plan with recipe details
 */
/**
 * Helper function to enrich a meal plan with recipe details
 */
function enrichPlanWithRecipes(plan, recipeMap) {
    const enrichedPlan = {};
    // For each day of the week
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    days.forEach(day => {
        const dayPlan = plan[day];
        if (!dayPlan)
            return;
        enrichedPlan[day] = {};
        // For each meal type
        mealTypes.forEach(mealType => {
            var _a, _b;
            if (dayPlan[mealType]) {
                const recipeId = (_b = (_a = dayPlan[mealType]) === null || _a === void 0 ? void 0 : _a.recipe) === null || _b === void 0 ? void 0 : _b.toString();
                if (recipeId && recipeMap[recipeId]) {
                    // If the meal plan already has recipe details but we want to update/add fields
                    const existingDetails = dayPlan[mealType].recipeDetails || {};
                    const recipe = recipeMap[recipeId];
                    enrichedPlan[day][mealType] = {
                        ...dayPlan[mealType],
                        recipeDetails: {
                            ...existingDetails,
                            title: recipe.title,
                            featuredImage: recipe.featuredImage,
                            category: recipe.category,
                            cookingTime: recipe.cookingTime,
                            difficulty: recipe.difficulty,
                            ingredients: recipe.ingredients || [],
                            steps: recipe.steps || [],
                            tips: recipe.tips || [],
                            nutrition: recipe.nutrition
                        }
                    };
                }
                else {
                    enrichedPlan[day][mealType] = dayPlan[mealType];
                }
            }
        });
    });
    return enrichedPlan;
}
/**
 * Helper function to embed recipe details into the meal plan
 */
/**
 * Helper function to embed recipe details into the meal plan
 */
function embedRecipeDetails(plan, recipeMap) {
    const enrichedPlan = {};
    // For each day of the week
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    days.forEach(day => {
        const dayPlan = plan[day];
        if (!dayPlan)
            return;
        enrichedPlan[day] = {};
        // For each meal type
        mealTypes.forEach(mealType => {
            var _a, _b;
            if (dayPlan[mealType]) {
                const recipeId = (_b = (_a = dayPlan[mealType]) === null || _a === void 0 ? void 0 : _a.recipe) === null || _b === void 0 ? void 0 : _b.toString();
                if (recipeId && recipeMap[recipeId]) {
                    // Get the complete recipe object
                    const recipe = recipeMap[recipeId];
                    enrichedPlan[day][mealType] = {
                        mealType: dayPlan[mealType].mealType,
                        recipe: recipeId,
                        recipeDetails: recipe.toObject ? recipe.toObject() : recipe
                    };
                }
                else {
                    // Recipe not found, just include the reference
                    enrichedPlan[day][mealType] = dayPlan[mealType];
                }
            }
        });
    });
    return enrichedPlan;
}
