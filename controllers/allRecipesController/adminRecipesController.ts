import { Express } from 'express';
import RecipeModel from '../../models/recipe';
import mongoose from 'mongoose';

// Delete A RECIPE
export const deleteRecipe = async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const recipe = await RecipeModel.findById(id);
    if (!recipe) {
      return res.status(400).json({ message: 'Recipe not found!' });
    }

    const adminRole = req.user?.role;
    const adminId = req.user?._id;

    if (recipe.adminId.toString() !== adminId  ) {
      return res
        .status(401)
        .json({ message: 'You are not authorized to delete this recipe' });
    }

    await RecipeModel.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ success: true, message: 'Recipe deleted successfully!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete recipe',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
// edit  a recipe
export const editRecipe = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    // Check if ID is valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID format',
      });
    }

    // Check if recipe exists
    const recipe = await RecipeModel.findById(id);
    console.log('RECIPE', recipe);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }

    if (
      recipe.adminId.toString() !== req.user?._id.toString() 
    ) {
      return res.status(401).json({
        success: false,
        message: 'You are not authorized to edit this recipe',
      });
    }

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
      'isPublished',
      'nutrition',
      'isPrivate',
    ];

    // Handle regular fields
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Special handling for nutrition field
    if (req.body.nutrition) {
      console.log('Updating nutrition field:', req.body.nutrition);
      console.log(updateData);
      // Process nutrition data with proper type conversion
      updateData.nutrition = {
        calories: Number(req.body.nutrition?.calories || 0),
        protein: Number(req.body.nutrition?.protein || 0),
        carbs: Number(req.body.nutrition?.carbs || 0),
        fat: Number(req.body.nutrition?.fat || 0),
        fiber: Number(req.body.nutrition?.fiber || 0),
        sugar: Number(req.body.nutrition?.sugar || 0),
      };
    }

    console.log('Update data:', updateData);

    const updatedRecipe = await RecipeModel.findByIdAndUpdate(id, updateData, {
      new: true, // Return updated document
      runValidators: true, // Run schema validation
      lean: true, // Return plain JS object instead of Mongoose document
    });

    console.log('Updated recipe nutrition:', updatedRecipe?.nutrition);

    return res.status(200).json({
      success: true,
      message: 'Recipe updated successfully',
      data: updatedRecipe,
    });
  } catch (error) {
    console.error('Error updating recipe:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update recipe',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
// GET ADMIN RECIPES

export const getAdminRecipes = async (req: any, res: any) => {
  console.log('here gotten');
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const sort = req.query.sort;
    const search = req.query.search;
    console.log('REACH HERRRERR');
    const adminId = req.user?._id;
    console.log('THE ADMIN ID I AM LOOKING FOR let us see id', adminId);

    const query: { [key: string]: any } = {};

    if (adminId) {
      const validObjectId = mongoose.Types.ObjectId.isValid(adminId)
        ? new mongoose.Types.ObjectId(adminId)
        : adminId;
      query.adminId = adminId;
    }
    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await RecipeModel.countDocuments(query);

    let sortOptions: any = {};
    switch (sort) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'title':
        sortOptions = { title: 1 };
        break;
      case 'rating':
        sortOptions = { averageRating: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 }; // newest by default
    }

    const recipes = await RecipeModel.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Admin recipes retrieved successfully',
      data: recipes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting admin recipes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin recipes',
      error: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const togglePublishStatus = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log('id from endpoint', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID format',
      });
    }

    const recipeToToggle = await RecipeModel.findById(id);

    console.log(recipeToToggle);
    if (!recipeToToggle) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }
    if (
      recipeToToggle.roleCreated === 'user' &&
      recipeToToggle.isPrivate === true
    ) {
      return res.status(403).json({
        success: false,
        message: 'Cannot publish private user recipes',
      });
    }
    const newPublishStatus = !recipeToToggle.isPublished;

    const updatedRecipe = await RecipeModel.findByIdAndUpdate(
      id,
      { isPublished: newPublishStatus },
      { new: true }
    );
    return res.status(200).json({
      success: true,
      message: `Recipe is now ${newPublishStatus ? 'published' : 'in draft mode'}`,
      data: {
        recipeId: id,
        isPublished: newPublishStatus,
      },
    });
  } catch (error) {
    console.error('Error getting admin recipes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to Publish recipe',
      error: error instanceof Error ? error.message : 'Server error',
    });
  }
};

// get recent created recipes

// //
//     return res.status(200).json({
//       success: true,
//       data: {
//         totalRecipes,
//         publishedRecipes,
//         unpublishedRecipes,
//         categories: categoryCounts,
//         difficulties: difficultyCounts,
//         avgCookingTime,
//         topRecipes,
//         recentRecipes
//       }
//     });
