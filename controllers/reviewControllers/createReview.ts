// filepath: controllers/reviewController.ts

import { Types } from 'mongoose';
import RecipeModel from '../../models/recipe';
import Review from '../../models/review';
import RecipeInteraction from '../../models/recipeInterractionModel';

// Create a new review
export const createReview = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { recipeId, rating, comment } = req.body;

    // Validation
    if (!recipeId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Recipe ID, rating, and comment are required"
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    // Check if recipe exists
    const recipe = await RecipeModel.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found"
      });
    }

    // Check if user already reviewed this recipe
    const existingReview = await Review.findOne({ recipeId, userId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this recipe"
      });
    }

    // Check if user is verified (actually cooked the recipe)
    const isVerified = await checkUserVerification(userId, recipeId);

    // Create review
    const review = new Review({
      recipeId,
      userId,
      username: req.user.username || req.user.name,
      profileImage: req.user.image || null,
      rating,
      comment: comment.trim(),
      isVerified 
    });

    await review.save();

    // Update recipe aggregation data
    await updateRecipeRatingAggregation(recipeId);

    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review
    });

  } catch (error) {
    console.error("Error creating review:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create review",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Helper function to check if user is verified
async function checkUserVerification(userId: string, recipeId: string): Promise<boolean> {
  try {
    // Method 1: Check if user completed cooking the recipe
    const completedCooking = await RecipeInteraction.findOne({
      userId,
      recipeId,
      status: 'completed',
      isVerifiedCook: true
    });

    if (completedCooking) return true;

    // Method 2: Check meal plan completion
    const mealPlanCompletion = await checkMealPlanVerification(userId, recipeId);
    if (mealPlanCompletion) return true;

    return false;
  } catch (error) {
    console.error('Error checking user verification:', error);
    return false;
  }
}

// Helper function to check meal plan verification
async function checkMealPlanVerification(userId: string, recipeId: string): Promise<boolean> {
  try {
    // Import MealPlan model
    const MealPlan = require('../../models/meal-planner').default;
    
    // Check if recipe exists in user's meal plans and is marked as completed
    const mealPlanWithRecipe = await MealPlan.findOne({
      user: userId,
      $or: [
        // Check all days and meal types for the recipe
        { 'plan.monday.breakfast.recipe': recipeId },
        { 'plan.monday.lunch.recipe': recipeId },
        { 'plan.monday.dinner.recipe': recipeId },
        { 'plan.tuesday.breakfast.recipe': recipeId },
        { 'plan.tuesday.lunch.recipe': recipeId },
        { 'plan.tuesday.dinner.recipe': recipeId },
        { 'plan.wednesday.breakfast.recipe': recipeId },
        { 'plan.wednesday.lunch.recipe': recipeId },
        { 'plan.wednesday.dinner.recipe': recipeId },
        { 'plan.thursday.breakfast.recipe': recipeId },
        { 'plan.thursday.lunch.recipe': recipeId },
        { 'plan.thursday.dinner.recipe': recipeId },
        { 'plan.friday.breakfast.recipe': recipeId },
        { 'plan.friday.lunch.recipe': recipeId },
        { 'plan.friday.dinner.recipe': recipeId },
        { 'plan.saturday.breakfast.recipe': recipeId },
        { 'plan.saturday.lunch.recipe': recipeId },
        { 'plan.saturday.dinner.recipe': recipeId },
        { 'plan.sunday.breakfast.recipe': recipeId },
        { 'plan.sunday.lunch.recipe': recipeId },
        { 'plan.sunday.dinner.recipe': recipeId }
      ]
    });

    if (!mealPlanWithRecipe) return false;

    // Check if recipe is in completed recipes array (if this field exists)
    if (mealPlanWithRecipe.completedRecipes) {
      const completedRecipe = mealPlanWithRecipe.completedRecipes.find(
        (completed: any) => completed.recipeId.toString() === recipeId && 
        completed.status === 'completed'
      );
      if (completedRecipe) return true;
    }

    // Alternative: Check if recipe interaction exists from meal plan
    const mealPlanInteraction = await RecipeInteraction.findOne({
      userId,
      recipeId,
      fromMealPlan: true,
      mealPlanId: mealPlanWithRecipe._id,
      status: { $in: ['completed', 'cooking_in_progress'] }
    });

    if (mealPlanInteraction) return true;

    // Alternative: Check based on meal plan date (recipe was planned for past date)
    const currentDate = new Date();
    const mealPlanDate = new Date(mealPlanWithRecipe.week);
    
    // If meal plan is from past week, consider it as "attempted"
    const daysDifference = Math.floor((currentDate.getTime() - mealPlanDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference > 7) { // Meal plan is older than a week
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking meal plan verification:', error);
    return false;
  }
}

// Helper function to update recipe rating aggregation
export async function updateRecipeRatingAggregation(recipeId: string | Types.ObjectId) {
  try {
    const aggregation = await Review.aggregate([
      { $match: { recipeId: new Types.ObjectId(recipeId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratings: { $push: '$rating' }
        }
      }
    ]);

    let updateData;

    if (aggregation.length === 0) {
      // No reviews
      updateData = {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    } else {
      const { averageRating, totalReviews, ratings } = aggregation[0];
      
      // Calculate rating distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach((rating: number) => {
        distribution[rating as keyof typeof distribution]++;
      });

      updateData = {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews,
        ratingDistribution: distribution
      };
    }

    await RecipeModel.findByIdAndUpdate(recipeId, updateData);

  } catch (error) {
    console.error('Error updating recipe rating aggregation:', error);
  }
}
