"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = __importDefault(require("../models/recipe"));
class MessageHandler {
    static async handleDatabaseQuery(intent, userContext, message) {
        const { action, entity } = intent;
        const userId = userContext.userId;
        try {
            switch (entity) {
                case 'recipes':
                    if (action === 'show' || action === 'get' || action === 'list') {
                        // Get user's recipes from database
                        const recipes = await recipe_1.default.find({ user: userId }).limit(10);
                        return this.formatRecipesResponse(recipes);
                    }
                    break;
                case 'favorites':
                    // Get user's favorite recipes
                    const favorites = await recipe_1.default.find({
                        user: userId,
                        isFavorite: true
                    }).limit(10);
                    return this.formatFavoritesResponse(favorites);
                case 'meal plan':
                    // Get current week's meal plan
                    const mealPlan = await recipe_1.default.findOne({
                        user: userId,
                        // Add date range logic here
                    });
                    return this.formatMealPlanResponse(mealPlan);
                default:
                    return `I can help you with your ${entity}, but I need more specific information. What would you like to know?`;
            }
        }
        catch (error) {
            console.error('Database query error:', error);
            return "I'm having trouble accessing your data right now. Please try again in a moment.";
        }
        return `I can help you ${action} your ${entity}. Let me check your data...`;
    }
    static formatRecipesResponse(recipes) {
        if (recipes.length === 0) {
            return "You don't have any saved recipes yet. Would you like me to help you create one?";
        }
        const recipeList = recipes.map((recipe, index) => `${index + 1}. ${recipe.title} (${recipe.cuisine || 'General'})`).join('\n');
        return `Here are your saved recipes:\n\n${recipeList}\n\nWould you like me to show you details for any of these recipes?`;
    }
    static formatFavoritesResponse(favorites) {
        if (favorites.length === 0) {
            return "You haven't marked any recipes as favorites yet. When you find recipes you love, you can add them to your favorites!";
        }
        const favoriteList = favorites.map((recipe, index) => `${index + 1}. ${recipe.title} ⭐`).join('\n');
        return `Here are your favorite recipes:\n\n${favoriteList}\n\nWhich one would you like to cook today?`;
    }
    static formatMealPlanResponse(mealPlan) {
        if (!mealPlan) {
            return "You don't have a meal plan for this week yet. Would you like me to create one for you?";
        }
        return `Here's your current meal plan:\n\n${this.formatMealPlanDetails(mealPlan)}`;
    }
    static formatMealPlanDetails(mealPlan) {
        // Format meal plan details - adjust based on your meal plan schema
        return "Meal plan details here...";
    }
}
