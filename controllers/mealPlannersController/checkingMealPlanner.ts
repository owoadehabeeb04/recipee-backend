import MealPlan from "../../models/meal-planner";
import RecipeModel from "../../models/recipe";
import { extractRecipeIds } from "./mealplanner";
import mongoose from "mongoose";

/**
 * Update shopping list item check status
 * Supports checking/unchecking individual items, multiple items, or items by category
 */
export const updateShoppingListCheckedItems = async (req: any, res: any) => {
    try {
      const { id } = req.params; // mealPlanId
      const { items = [], category, checked = true, checkAll = false } = req.body;
      const userId = req.user._id;
  
      // Validate ObjectId
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid meal plan ID'
        });
      }
  
      // Find the meal plan
      const mealPlan = await MealPlan.findOne({ _id: id, user: userId });
      
      if (!mealPlan) {
        return res.status(404).json({
          success: false,
          message: 'Meal plan not found'
        });
      }
  
      // Initialize checkedItems if it doesn't exist
      if (!mealPlan.checkedItems) {
        mealPlan.checkedItems = [];
      }
  
      // Handle check all option
      if (checkAll) {
        const recipeIds = extractRecipeIds(mealPlan.plan);
        
        if (recipeIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No recipes found in this meal plan'
          });
        }
  
        // Get ingredients from all recipes
        const recipes = await RecipeModel.find({ 
          _id: { $in: recipeIds } 
        }).select('ingredients');
        
        // Get all ingredient names
        const allIngredientNames:any = [];
        recipes.forEach(recipe => {
          recipe.ingredients.forEach(ingredient => {
            const { name } = typeof ingredient === 'string' ? JSON.parse(ingredient) : ingredient;
            allIngredientNames.push(name.toLowerCase().trim());
          });
        });
        
        // Update checkedItems array based on checked flag
        if (checked) {
          // Add all unique ingredients to checked items
          const uniqueIngredients = [...new Set(allIngredientNames)];
          mealPlan.checkedItems = uniqueIngredients;
        } else {
          // Clear all checked items
          mealPlan.checkedItems = [];
        }
      }
      // Handle check by category
      else if (category) {
        const recipeIds = extractRecipeIds(mealPlan.plan);
        
        if (recipeIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No recipes found in this meal plan'
          });
        }
  
        // Get ingredients from all recipes
        const recipes = await RecipeModel.find({ 
          _id: { $in: recipeIds } 
        }).select('ingredients');
        
        // Define ingredient categories (same as in generateCategorizedShoppingList)
        const categories: { [key: string]: string[] } = {
          'Produce': ['tomato', 'lettuce', 'cucumber', 'onion', 'garlic', 'potato', 'carrot', 'bell pepper', 'spinach', 'kale', 'broccoli', 'cabbage', 'mushroom', 'zucchini', 'avocado', 'lemon', 'lime', 'apple', 'banana', 'berry', 'fruit'],
          'Meat & Seafood': ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'bacon', 'sausage', 'meat'],
          'Dairy & Eggs': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'dairy'],
          'Bakery': ['bread', 'bun', 'roll', 'tortilla', 'pita', 'pastry', 'dough'],
          'Pantry': ['rice', 'pasta', 'flour', 'sugar', 'oil', 'vinegar', 'sauce', 'broth', 'stock', 'can', 'beans', 'lentil', 'chickpea', 'corn', 'tomato paste', 'spice', 'herb', 'cereal', 'oats'],
          'Frozen': ['frozen'],
          'Beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'drink'],
          'Miscellaneous': []
        };
  
        // Validate category
        if (!Object.keys(categories).includes(category)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid category'
          });
        }
  
        // Get all ingredients in this category
        const categoryKeywords = categories[category];
        const categoryIngredients: any[] = [];
        
        recipes.forEach((recipe: { ingredients: string[]; }) => {
          recipe.ingredients.forEach((ingredient: string) => {
            const { name } = typeof ingredient === 'string' ? JSON.parse(ingredient) : ingredient;
            const lowerName = name.toLowerCase().trim();
            
            // Check if this ingredient belongs to the requested category
            const isInCategory = categoryKeywords.length > 0 
              ? categoryKeywords.some(keyword => lowerName.includes(keyword))
              : !Object.entries(categories).some(([cat, keywords]) => 
                  cat !== 'Miscellaneous' && keywords.some(keyword => lowerName.includes(keyword))
                );
            
            if (isInCategory) {
              categoryIngredients.push(lowerName);
            }
          });
        });
  
        // Update checkedItems array based on checked flag
        if (checked) {
          // Add all category ingredients to checked items (prevent duplicates)
          const currentSet = new Set(mealPlan.checkedItems);
          categoryIngredients.forEach(item => currentSet.add(item));
          mealPlan.checkedItems = Array.from(currentSet);
        } else {
          // Remove all category ingredients from checked items
          mealPlan.checkedItems = mealPlan.checkedItems.filter(
              (            item: any) => !categoryIngredients.includes(item)
          );
        }
      }
      // Handle specific items
      else if (items && items.length > 0) {
        // Convert all items to lowercase for consistent matching
        const normalizedItems = items.map((item: string) => item.toLowerCase().trim());
        
        // Update checkedItems array based on checked flag
        if (checked) {
          // Add items to checked items (prevent duplicates)
          const currentSet = new Set(mealPlan.checkedItems);
          normalizedItems.forEach((item: unknown) => currentSet.add(item));
          mealPlan.checkedItems = Array.from(currentSet);
        } else {
          // Remove items from checked items
          mealPlan.checkedItems = mealPlan.checkedItems.filter(
              (            item: any) => !normalizedItems.includes(item)
          );
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'No items, category, or checkAll flag provided'
        });
      }
      
      // Update lastShoppingListUpdate timestamp
      mealPlan.lastShoppingListUpdate = new Date();
      
      // Save changes
      await mealPlan.save();
      
      // Generate updated shopping list with checked status
      const shoppingList = await generateShoppingListWithStatus(mealPlan);
      
      return res.status(200).json({
        success: true,
        message: 'Shopping list updated successfully',
        data: {
          checkedItems: mealPlan.checkedItems,
          shoppingList
        }
      });
      
    } catch (error) {
      console.error('Error updating shopping list:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update shopping list',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
  /**
   * Get shopping list with check status
   */
  export const getShoppingListWithStatus = async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      // Validate ObjectId
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid meal plan ID'
        });
      }
    
      // Get the meal plan
      const mealPlan = await MealPlan.findOne({ _id: id, user: userId });
      
      if (!mealPlan) {
        return res.status(404).json({
          success: false,
          message: 'Meal plan not found'
        });
      }
  
      // Generate shopping list with checked status
      const shoppingList = await generateShoppingListWithStatus(mealPlan);
      
      return res.status(200).json({
        success: true,
        message: 'Shopping list retrieved successfully',
        data: shoppingList
      });
      
    } catch (error) {
      console.error('Error getting shopping list:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get shopping list',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
  /**
   * Helper function to generate shopping list with checked status
   */
  async function generateShoppingListWithStatus(mealPlan: any) {
    // Extract all recipe IDs from the plan
    const recipeIds = extractRecipeIds(mealPlan.plan);
    
    if (recipeIds.length === 0) {
      return {
        mealPlanId: mealPlan._id,
        mealPlanName: mealPlan.name,
        week: mealPlan.week,
        categorizedIngredients: {},
        checkedItems: mealPlan.checkedItems || []
      };
    }
  
    // Get full recipe data for all recipes in the plan
    const recipes = await RecipeModel.find({ 
      _id: { $in: recipeIds } 
    }).select('title ingredients');
    
    if (!recipes || recipes.length === 0) {
      return {
        mealPlanId: mealPlan._id,
        mealPlanName: mealPlan.name,
        week: mealPlan.week,
        categorizedIngredients: {},
        checkedItems: mealPlan.checkedItems || []
      };
    }
    
    // Define ingredient categories
    const categories: { [key: string]: string[] } = {
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
    const categorizedList: { [key: string]: any[] } = {};
    Object.keys(categories).forEach(category => {
      categorizedList[category] = [];
    });
    
    // Process all ingredients
    recipes.forEach(recipe => {
      recipe.ingredients.forEach(ingredient => {
        const { name, quantity, unit } = typeof ingredient === 'string' ? JSON.parse(ingredient) : ingredient;
        const lowerName = name.toLowerCase().trim();
        
        // Determine if this ingredient is checked
        const isChecked = mealPlan.checkedItems && mealPlan.checkedItems.includes(lowerName);
        
        // Determine which category this ingredient belongs to
        let category = 'Miscellaneous'; // Default category
        
        for (const [catName, keywords] of Object.entries(categories)) {
          if (keywords.some(keyword => lowerName.includes(keyword))) {
            category = catName;
            break;
          }
        }
        
        // Check if this ingredient name already exists in this category
        const existingItem = categorizedList[category].find(
          item => item.name.toLowerCase() === lowerName
        );
        
        if (existingItem) {
          // Ingredient already in list, add recipe reference
          if (!existingItem.recipes.includes(recipe.title)) {
            existingItem.recipes.push(recipe.title);
          }
          // Add as a separate item with its own quantity/unit
          existingItem.items.push({ quantity, unit, recipe: recipe.title });
        } else {
          // New ingredient
          categorizedList[category].push({
            name,
            recipes: [recipe.title],
            items: [{ quantity, unit, recipe: recipe.title }],
            checked: isChecked
          });
        }
      });
    });
    
    // Sort ingredients alphabetically within each category
    Object.keys(categorizedList).forEach(category => {
      categorizedList[category].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    // Remove empty categories
    const finalCategorizedList: { [key: string]: any[] } = {};
    Object.keys(categorizedList).forEach(category => {
      if (categorizedList[category].length > 0) {
        finalCategorizedList[category] = categorizedList[category];
      }
    });
    
    // Calculate category stats (how many items checked per category)
    const categoryStats: { [key: string]: { total: number; checked: number } } = {};
    Object.entries(finalCategorizedList).forEach(([category, items]) => {
      const total = items.length;
      const checked = items.filter(item => item.checked).length;
      categoryStats[category] = { total, checked };
    });
    
    // Create the final shopping list
    return {
      mealPlanId: mealPlan._id,
      mealPlanName: mealPlan.name,
      week: mealPlan.week,
      numberOfRecipes: recipes.length,
      categorizedIngredients: finalCategorizedList,
      categoryStats,
      checkedItems: mealPlan.checkedItems || [],
      lastUpdated: mealPlan.lastShoppingListUpdate || null
    };
  }
  
  /**
   * Reset shopping list (uncheck all items)
   */
  export const resetShoppingList = async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      // Validate ObjectId
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid meal plan ID'
        });
      }
    
      // Get the meal plan
      const mealPlan = await MealPlan.findOne({ _id: id, user: userId });
      
      if (!mealPlan) {
        return res.status(404).json({
          success: false,
          message: 'Meal plan not found'
        });
      }
      
      // Reset checked items and update timestamp
      mealPlan.checkedItems = [];
      mealPlan.lastShoppingListUpdate = new Date();
      
      await mealPlan.save();
      
      return res.status(200).json({
        success: true,
        message: 'Shopping list reset successfully',
        data: {
          checkedItems: []
        }
      });
      
    } catch (error) {
      console.error('Error resetting shopping list:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to reset shopping list',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };