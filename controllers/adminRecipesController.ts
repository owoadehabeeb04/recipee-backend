import { Express } from 'express';
import RecipeModel from '../models/recipe';
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

    if (recipe.adminId.toString() !== adminId && adminRole !== 'admin') {
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

    // Check if recipe exists
    const recipe = await RecipeModel.findById(id);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }

    if (
      recipe.adminId.toString() !== req.user?._id.toString() &&
      req.user?.role !== 'admin'
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
      'featuredImage',
      'isPublished',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

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
    console.error(error);
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
