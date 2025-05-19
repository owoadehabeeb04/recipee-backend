import { Request, Response } from 'express';
import mongoose from 'mongoose';
import RecipeModel from '../../models/recipe';
import MealPlan from '../../models/meal-planner';



/**
 * Helper function to extract recipe IDs from a meal plan
 */
export function extractRecipeIds(plan: any): string[] {
  const recipeIds = new Set<string>();
  
  // For each day of the week
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  
  days.forEach(day => {
    const dayPlan = plan[day];
    if (!dayPlan) return;
    
    // For each meal type
    mealTypes.forEach(mealType => {
      if (dayPlan[mealType]?.recipe) {
        recipeIds.add(dayPlan[mealType].recipe.toString());
      }
    });
  });
  
  return Array.from(recipeIds);
}

// endpoint to get a particular meal plan stats such as no of total meals planned no of days planned notes too and the title of the particularmeal plan

export function enrichPlanWithRecipes(plan: any, recipeMap: any): any {
  const enrichedPlan: any = {};
  
  // For each day of the week
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  
  days.forEach(day => {
    const dayPlan = plan[day];
    if (!dayPlan) return;
    
    enrichedPlan[day] = {};
    
    // For each meal type
    mealTypes.forEach(mealType => {
      if (dayPlan[mealType]) {
        const recipeId = dayPlan[mealType]?.recipe?.toString();
        
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
        } else {
          enrichedPlan[day][mealType] = dayPlan[mealType];
        }
      }
    });
  });
  
  return enrichedPlan;
}


export function embedRecipeDetails(plan: any, recipeMap: any): any {
  const enrichedPlan: any = {};
  
  // For each day of the week
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  
  days.forEach(day => {
    const dayPlan = plan[day];
    if (!dayPlan) return;
    
    enrichedPlan[day] = {};
    
    // For each meal type
    mealTypes.forEach(mealType => {
      if (dayPlan[mealType]) {
        const recipeId = dayPlan[mealType]?.recipe?.toString();
        
        if (recipeId && recipeMap[recipeId]) {
          // Get the complete recipe object
          const recipe = recipeMap[recipeId];
          
          enrichedPlan[day][mealType] = {
            mealType: dayPlan[mealType].mealType,
            recipe: recipeId,
            recipeDetails: recipe.toObject ? recipe.toObject() : recipe
          };
        } else {
          // Recipe not found, just include the reference
          enrichedPlan[day][mealType] = dayPlan[mealType];
        }
      }
    });
  });
  
  return enrichedPlan;
}





export const getMealPlanStats = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    console.log({id})
    console.log({userId})
    
    // Find the meal plan and verify ownership
    const mealPlan = await MealPlan.findOne({ _id: id, user: userId });
    
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found or you don't have access to it"
      });
    }
    
    // Log the meal plan structure to understand what we're working with
    console.log("Meal plan structure keys:", Object.keys(mealPlan.toObject()));
    
    // Handle the different structure - check if we have a 'plan' property instead of 'meals'
    if (mealPlan.plan) {
      console.log("Using 'plan' structure for meal plan");
      return handlePlanStructure(mealPlan, res);
    } else if (mealPlan.meals) {
      console.log("Using 'meals' structure for meal plan");
      return handleMealsStructure(mealPlan, res);
    } else {
      console.log("Unknown meal plan structure:", mealPlan);
      return res.status(400).json({
        success: false,
        message: "Meal plan has an unexpected structure"
      });
    }
    
  } catch (error) {
    console.error("Error retrieving meal plan stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve meal plan statistics",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Handle meal plans with a 'plan' property (days of the week structure)
function handlePlanStructure(mealPlan: any, res: any) {
  try {
    const plan = mealPlan.plan;
    
    // Count the number of days in the plan
    const daysInPlan = Object.keys(plan).length;
    
    // Calculate start and end dates based on the meal plan's week property
    const startDate = new Date(mealPlan.week || mealPlan.startDate);
    const endDate = new Date(mealPlan.week || mealPlan.startDate);
    endDate.setDate(endDate.getDate() + daysInPlan - 1);
    
    // Initialize counters
    let totalMeals = 0;
    const mealsByType: any = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0
    };
    
    // Set to track unique recipes
    const uniqueRecipeIds = new Set();
    
    // Nutrition totals
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    // Process each day in the plan
    Object.keys(plan).forEach(day => {
      const dayPlan = plan[day];
      
      // Check for each meal type
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      
      mealTypes.forEach(mealType => {
        const meal = dayPlan[mealType];
        
        if (meal) {
          // Count the meal
          mealsByType[mealType]++;
          totalMeals++;
          
          // Track unique recipe
          if (meal.recipe || meal.recipeId) {
            const recipeId = (meal.recipe || meal.recipeId).toString();
            uniqueRecipeIds.add(recipeId);
          }
          
          // Add nutrition data if available
          const nutrition = meal.nutrition || meal.nutritionInfo;
          if (nutrition) {
            totalCalories += nutrition.calories || 0;
            totalProtein += nutrition.protein || 0;
            totalCarbs += nutrition.carbs || 0;
            totalFat += nutrition.fat || 0;
          }
        }
      });
    });
    
    const uniqueRecipeCount = uniqueRecipeIds.size;
    
    const avgDailyCalories = daysInPlan > 0 ? Math.round(totalCalories / daysInPlan) : totalCalories;
    const avgDailyProtein = daysInPlan > 0 ? Math.round(totalProtein / daysInPlan) : totalProtein;
    const avgDailyCarbs = daysInPlan > 0 ? Math.round(totalCarbs / daysInPlan) : totalCarbs;
    const avgDailyFat = daysInPlan > 0 ? Math.round(totalFat / daysInPlan) : totalFat;
    
    // Compile stats
    const mealPlanStats = {
      title: mealPlan.name || mealPlan.title,
      description: mealPlan.description || "",
      notes: mealPlan.notes || "",
      startDate: startDate,
      endDate: endDate,
      week: mealPlan.week,
      numberOfDays: daysInPlan,
      totalMeals: totalMeals,
      mealsByType: mealsByType,
      uniqueRecipes: uniqueRecipeCount,
      nutritionSummary: {
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        averageDaily: {
          calories: avgDailyCalories,
          protein: avgDailyProtein,
          carbs: avgDailyCarbs,
          fat: avgDailyFat
        }
      },
      createdAt: mealPlan.createdAt,
      lastUpdated: mealPlan.updatedAt
    };
    
    return res.status(200).json({
      success: true,
      message: "Meal plan statistics retrieved successfully",
      data: mealPlanStats
    });
  } catch (error) {
    console.error("Error processing plan structure:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing meal plan data",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

// Handle meal plans with a 'meals' array property (original structure)
function handleMealsStructure(mealPlan: any, res: any) {
  try {
    interface Meal {
      type: string;
      recipe?: any;
      nutritionInfo?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
      };
    }
    
    // Count the number of days planned
    const startDate = new Date(mealPlan.startDate);
    const endDate = new Date(mealPlan.endDate || mealPlan.startDate);
    const daysDifference = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Ensure meals is an array and has length property
    const meals = Array.isArray(mealPlan.meals) ? mealPlan.meals : [];
    const totalMeals = meals.length;
    
    // Count meals by type
    const mealsByType = {
      breakfast: meals.filter((meal: Meal) => meal.type === 'breakfast').length,
      lunch: meals.filter((meal: Meal) => meal.type === 'lunch').length,
      dinner: meals.filter((meal: Meal) => meal.type === 'dinner').length,
      snack: meals.filter((meal: Meal) => meal.type === 'snack').length
    };
    
    // Get unique recipes
    const uniqueRecipeIds = new Set();
    meals.forEach((meal: Meal) => {
      if (meal.recipe) {
        uniqueRecipeIds.add(typeof meal.recipe === 'object' ? 
          meal.recipe.toString() : meal.recipe);
      }
    });
    const uniqueRecipeCount = uniqueRecipeIds.size;
    
    // Calculate nutrition info if available
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    meals.forEach((meal: Meal) => {
      if (meal.nutritionInfo) {
        totalCalories += meal.nutritionInfo.calories || 0;
        totalProtein += meal.nutritionInfo.protein || 0;
        totalCarbs += meal.nutritionInfo.carbs || 0;
        totalFat += meal.nutritionInfo.fat || 0;
      }
    });
    
    // Calculate average daily nutrition
    const avgDailyCalories = daysDifference > 0 ? Math.round(totalCalories / daysDifference) : totalCalories;
    const avgDailyProtein = daysDifference > 0 ? Math.round(totalProtein / daysDifference) : totalProtein;
    const avgDailyCarbs = daysDifference > 0 ? Math.round(totalCarbs / daysDifference) : totalCarbs;
    const avgDailyFat = daysDifference > 0 ? Math.round(totalFat / daysDifference) : totalFat;
    
    // Compile stats
    const mealPlanStats = {
      title: mealPlan.title,
      description: mealPlan.description || "",
      notes: mealPlan.notes || "",
      startDate: mealPlan.startDate,
      endDate: mealPlan.endDate,
      numberOfDays: daysDifference,
      totalMeals: totalMeals,
      mealsByType: mealsByType,
      uniqueRecipes: uniqueRecipeCount,
      nutritionSummary: {
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        averageDaily: {
          calories: avgDailyCalories,
          protein: avgDailyProtein,
          carbs: avgDailyCarbs,
          fat: avgDailyFat
        }
      },
      createdAt: mealPlan.createdAt,
      lastUpdated: mealPlan.updatedAt
    };
    
    return res.status(200).json({
      success: true,
      message: "Meal plan statistics retrieved successfully",
      data: mealPlanStats
    });
  } catch (error) {
    console.error("Error processing meals structure:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing meal plan data",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

