"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePrintableShoppingList = exports.generateCategorizedShoppingList = exports.generateShoppingList = void 0;
const meal_planner_1 = __importDefault(require("../../models/meal-planner"));
const recipe_1 = __importDefault(require("../../models/recipe"));
const mealplanner_1 = require("./mealplanner");
const mongoose_1 = __importDefault(require("mongoose"));
const generateShoppingList = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid meal plan ID'
            });
        }
        const mealPlan = await meal_planner_1.default.findOne({ _id: id, user: userId });
        if (!mealPlan) {
            return res.status(404).json({
                success: false,
                message: 'Meal plan not found'
            });
        }
        const recipeIds = (0, mealplanner_1.extractRecipeIds)(mealPlan.plan);
        if (recipeIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No recipes found in this meal plan'
            });
        }
        const recipes = await recipe_1.default.find({
            _id: { $in: recipeIds }
        }).select('title ingredients');
        if (!recipes || recipes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No recipes found for this meal plan'
            });
        }
        // Create a map for organizing shopping ingredients
        const shoppingList = new Map();
        // Add all ingredients to the shopping list, grouped by name
        recipes.forEach(recipe => {
            recipe.ingredients.forEach(ingredient => {
                const { name, quantity, unit } = typeof ingredient === 'string' ? JSON.parse(ingredient) : ingredient;
                const key = name.toLowerCase().trim();
                if (shoppingList.has(key)) {
                    // Ingredient already in list, add note about recipe
                    const item = shoppingList.get(key);
                    if (!item.recipes.includes(recipe.title)) {
                        item.recipes.push(recipe.title);
                    }
                    // We don't sum quantities because units might be different
                    // Just note as separate items
                    item.items.push({ quantity, unit, recipe: recipe.title });
                }
                else {
                    // New ingredient
                    shoppingList.set(key, {
                        name: name,
                        recipes: [recipe.title],
                        items: [{ quantity, unit, recipe: recipe.title }]
                    });
                }
            });
        });
        // Convert map to array and sort alphabetically
        const groupedIngredients = Array.from(shoppingList.values())
            .sort((a, b) => a.name.localeCompare(b.name));
        // Create the final shopping list
        const finalShoppingList = {
            mealPlanId: mealPlan._id,
            mealPlanName: mealPlan.name,
            week: mealPlan.week,
            numberOfRecipes: recipes.length,
            ingredients: groupedIngredients
        };
        return res.status(200).json({
            success: true,
            message: 'Shopping list generated successfully',
            data: finalShoppingList
        });
    }
    catch (error) {
        console.error('Error generating shopping list:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate shopping list',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.generateShoppingList = generateShoppingList;
/**
 * Generate a shopping list with categorized ingredients
 */
const generateCategorizedShoppingList = async (req, res) => {
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
        // Extract all recipe IDs from the plan
        const recipeIds = (0, mealplanner_1.extractRecipeIds)(mealPlan.plan);
        if (recipeIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No recipes found in this meal plan'
            });
        }
        // Get full recipe data for all recipes in the plan
        const recipes = await recipe_1.default.find({
            _id: { $in: recipeIds }
        }).select('title ingredients');
        if (!recipes || recipes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No recipes found for this meal plan'
            });
        }
        // Define ingredient categories
        const categories = {
            'Produce': ['tomato', 'lettuce', 'cucumber', 'onion', 'garlic', 'potato', 'carrot', 'bell pepper', 'spinach', 'kale', 'broccoli', 'cabbage', 'mushroom', 'zucchini', 'avocado', 'lemon', 'lime', 'apple', 'banana', 'berry', 'fruit'],
            'Meat & Seafood': ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'bacon', 'sausage', 'meat'],
            'Dairy & Eggs': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'dairy'],
            'Bakery': ['bread', 'bun', 'roll', 'tortilla', 'pita', 'pastry', 'dough'],
            'Pantry': ['rice', 'pasta', 'flour', 'sugar', 'oil', 'vinegar', 'sauce', 'broth', 'stock', 'can', 'beans', 'lentil', 'chickpea', 'corn', 'tomato paste', 'spice', 'herb', 'cereal', 'oats'],
            'Frozen': ['frozen'],
            'Beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'drink'],
            'Miscellaneous': []
        };
        // Create a map for organizing shopping ingredients by category
        const categorizedList = {};
        Object.keys(categories).forEach(category => {
            categorizedList[category] = [];
        });
        // Process all ingredients
        recipes.forEach(recipe => {
            recipe.ingredients.forEach(ingredient => {
                const { name, quantity, unit } = typeof ingredient === 'string' ? JSON.parse(ingredient) : ingredient;
                const lowerName = name.toLowerCase().trim();
                // Determine which category this ingredient belongs to
                let category = 'Miscellaneous'; // Default category
                for (const [catName, keywords] of Object.entries(categories)) {
                    if (keywords.some(keyword => lowerName.includes(keyword))) {
                        category = catName;
                        break;
                    }
                }
                // Check if this ingredient name already exists in this category
                const existingItem = categorizedList[category].find(item => item.name.toLowerCase() === lowerName);
                if (existingItem) {
                    // Ingredient already in list, add recipe reference
                    if (!existingItem.recipes.includes(recipe.title)) {
                        existingItem.recipes.push(recipe.title);
                    }
                    // Add as a separate item with its own quantity/unit
                    existingItem.items.push({ quantity, unit, recipe: recipe.title });
                }
                else {
                    // New ingredient
                    categorizedList[category].push({
                        name,
                        recipes: [recipe.title],
                        items: [{ quantity, unit, recipe: recipe.title }]
                    });
                }
            });
        });
        // Sort ingredients alphabetically within each category
        Object.keys(categorizedList).forEach(category => {
            categorizedList[category].sort((a, b) => a.name.localeCompare(b.name));
        });
        // Remove empty categories
        const finalCategorizedList = {};
        Object.keys(categorizedList).forEach(category => {
            if (categorizedList[category].length > 0) {
                finalCategorizedList[category] = categorizedList[category];
            }
        });
        // Create the final shopping list
        const finalShoppingList = {
            mealPlanId: mealPlan._id,
            mealPlanName: mealPlan.name,
            week: mealPlan.week,
            numberOfRecipes: recipes.length,
            categorizedIngredients: finalCategorizedList
        };
        return res.status(200).json({
            success: true,
            message: 'Categorized shopping list generated successfully',
            data: finalShoppingList
        });
    }
    catch (error) {
        console.error('Error generating categorized shopping list:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate shopping list',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.generateCategorizedShoppingList = generateCategorizedShoppingList;
/**
 * Generate a printable/shareable shopping list
 */
const generatePrintableShoppingList = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { format = 'json' } = req.query;
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
        // Extract all recipe IDs from the plan
        const recipeIds = (0, mealplanner_1.extractRecipeIds)(mealPlan.plan);
        if (recipeIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No recipes found in this meal plan'
            });
        }
        // Get full recipe data for all recipes in the plan
        const recipes = await recipe_1.default.find({
            _id: { $in: recipeIds }
        }).select('title ingredients');
        // Process all ingredients, attempting to combine when possible
        const combinedIngredients = new Map();
        recipes.forEach(recipe => {
            recipe.ingredients.forEach(ingredient => {
                const { name, quantity, unit } = typeof ingredient === 'string' ? JSON.parse(ingredient) : ingredient;
                const key = name.toLowerCase().trim();
                // Try to combine ingredients with same name and unit
                if (combinedIngredients.has(key)) {
                    const existingItem = combinedIngredients.get(key);
                    const sameUnitItem = existingItem.items.find((i) => i.unit === unit);
                    if (sameUnitItem) {
                        // If same unit, try to combine quantities
                        try {
                            const numericQuantity = parseFloat(quantity);
                            const existingQuantity = parseFloat(sameUnitItem.quantity);
                            if (!isNaN(numericQuantity) && !isNaN(existingQuantity)) {
                                sameUnitItem.quantity = (numericQuantity + existingQuantity).toString();
                                sameUnitItem.recipes.push(recipe.title);
                            }
                            else {
                                existingItem.items.push({ quantity, unit, recipes: [recipe.title] });
                            }
                        }
                        catch (e) {
                            existingItem.items.push({ quantity, unit, recipes: [recipe.title] });
                        }
                    }
                    else {
                        // Different unit, add as new item
                        existingItem.items.push({ quantity, unit, recipes: [recipe.title] });
                    }
                    // Add recipe to the list of recipes for this ingredient
                    if (!existingItem.recipes.includes(recipe.title)) {
                        existingItem.recipes.push(recipe.title);
                    }
                }
                else {
                    // New ingredient
                    combinedIngredients.set(key, {
                        name,
                        recipes: [recipe.title],
                        items: [{ quantity, unit, recipes: [recipe.title] }]
                    });
                }
            });
        });
        // Convert map to array and sort alphabetically
        const shoppingItems = Array.from(combinedIngredients.values())
            .sort((a, b) => a.name.localeCompare(b.name));
        const shoppingListData = {
            mealPlanName: mealPlan.name,
            week: formatDate(mealPlan.week),
            items: shoppingItems
        };
        // Return data in requested format
        if (format === 'text') {
            // Generate plain text version
            let textOutput = `SHOPPING LIST FOR: ${shoppingListData.mealPlanName}\n`;
            textOutput += `WEEK OF: ${shoppingListData.week}\n\n`;
            shoppingItems.forEach(item => {
                textOutput += `□ ${item.name}:\n`;
                item.items.forEach((subItem) => {
                    textOutput += `    ${subItem.quantity} ${subItem.unit}\n`;
                });
                textOutput += '\n';
            });
            return res.status(200).send(textOutput);
        }
        else {
            // Return JSON by default
            return res.status(200).json({
                success: true,
                message: 'Shopping list generated successfully',
                data: shoppingListData
            });
        }
    }
    catch (error) {
        console.error('Error generating printable shopping list:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate shopping list',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.generatePrintableShoppingList = generatePrintableShoppingList;
// Helper function for formatting dates
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
