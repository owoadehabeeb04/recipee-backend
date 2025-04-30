import mongoose from 'mongoose';
import RecipeModel from '../models/recipe';
import FavoriteModel from '../models/favoriteRecipe';


/**
 * Controller to edit a user's recipe
 */
export const editUserRecipe = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if ID is valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID format',
      });
    }

    // Check if recipe exists
    const recipe = await RecipeModel.findById(id);
    
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
    const updateData: { [key: string]: any } = {};

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
        calories: Number(req.body.nutrition?.calories || 0),
        protein: Number(req.body.nutrition?.protein || 0),
        carbs: Number(req.body.nutrition?.carbs || 0),
        fat: Number(req.body.nutrition?.fat || 0),
        fiber: Number(req.body.nutrition?.fiber || 0),
        sugar: Number(req.body.nutrition?.sugar || 0),
      };
    }

    const updatedRecipe = await RecipeModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Recipe updated successfully',
      data: updatedRecipe,
    });
  } catch (error) {
    console.error('Error updating user recipe:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update recipe',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Controller to delete a user's recipe
 */
export const deleteUserRecipe = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if ID is valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID format',
      });
    }

    // Check if recipe exists
    const recipe = await RecipeModel.findById(id);
    
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
    await RecipeModel.findByIdAndDelete(id);
    
    // Also remove from user's favorites if it exists there
    await FavoriteModel.updateOne(
      { user: userId },
      { $pull: { recipes: id } }
    );

    return res.status(200).json({
      success: true,
      message: 'Recipe deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user recipe:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete recipe',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

