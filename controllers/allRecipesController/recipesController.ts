import { Express } from 'express';

import mongoose from 'mongoose';
import RecipeModel from '../../models/recipe';
import UserModel from '../../models/user';

// GET ALL RECIPES
export const getAllRecipes = async (req: any, res: any) => {
  try {
    // pagination to prevent bulky recipes
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get search and category from query string
    const search = req.query.search as string;
    const category = req.query.category as string;
    const sort = (req.query.sort as string) || 'newest';

    // Improve role detection
    const hasValidAuth = !!req.user;
    const userRole = req.user?.role || 'user';

    // Build query object
    let query: any = {};

    // Only filter by isPublished if the user isn't an admin
    if (!hasValidAuth || userRole === 'user') {
      query.isPublished = true;
      console.log('Filtering for published recipes only');
    } else {
      console.log('Admin access - showing all recipes');
    }

    // Add other filters
    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Count the total number of matching recipes
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
    console.log('Sorting by:', sort);

    const recipes = await RecipeModel.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    console.log('Recipes found:', recipes.length);

    return res.status(200).json({
      message: 'Gotten recipes successfully',
      data: recipes,
      status: 200,
      pagination: {
        limit,
        page,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error in getAllRecipes:', error);
    return res.status(500).json({
      message: 'server error',
    });
  }
};
// CREATE A RECIPE
export const createRecipe = async (req: any, res: any) => {
  try {
    const {
      title,
      servings,
      description,
      difficulty,
      category,
      cookingTime,
      steps,
      ingredients,
      featuredImage,
      tips,
    } = req.body;

    const adminId = req.user?._id;

    // Make sure the ID is in the correct format for MongoDB
    let formattedAdminId;
    try {
      // If adminId is a string, convert it to ObjectId
      formattedAdminId =
        typeof adminId === 'string'
          ? new mongoose.Types.ObjectId(adminId)
          : adminId;
    } catch (err) {
      console.error('Error converting admin ID:', err);
      return res.status(400).json({
        success: false,
        message: 'Invalid admin ID format',
      });
    }

    // Get complete admin details from database with proper error handling
    const adminDetail = await UserModel.findById(formattedAdminId);

    // Debug the admin details result
    if (adminDetail) {
      console.log('Admin name:', adminDetail.username);
    }

    if (!adminDetail) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found',
      });
    }

    // Validation checking (you already have this)

    // Make sure the admin field is set to the entire document, not just the ID
    const newRecipe = new RecipeModel({
      admin: adminDetail._id,
      adminDetails: {
        name: adminDetail.username,
        email: adminDetail.email,
        role: adminDetail.role,
      },
      adminId,
      title,
      description,
      category,
      cookingTime,
      difficulty: difficulty || 'medium',
      servings,
      ingredients,
      steps,
      featuredImage: featuredImage || '',
      isPublished: false,
      tips,
    });

    const savedRecipe = await newRecipe.save();

    // Debug the saved recipe
    // console.log("Saved recipe admin field:", savedRecipe.admin);
    // console.log("Saved recipe adminDetails:", savedRecipe.adminDetails);

    return res.status(201).json({
      success: true,
      message: 'Recipe created!',
      data: savedRecipe,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: 'Failed to create recipe, An unknown error occured ' });
  }
};

// GET RECIPE STATISTICS
export const getStatistics = async (req: any, res: any) => {
  try {
    const adminId = req.user?._id;

    const allRecipes = await RecipeModel.countDocuments();
    const myRecipes = await RecipeModel.countDocuments({ adminId });
    const publishedRecipes = await RecipeModel.countDocuments({
      adminId,
      isPublished: true,
    });
    const unpublishedRecipes = myRecipes - publishedRecipes;
    return res.status(200).json({
      success: true,
      data: {
        allRecipes,
        myRecipes,
        publishedRecipes,
        unpublishedRecipes,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// get recent recipes data
export const getYourRecentRecipes = async (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const adminId = req.user?._id;
    const query = { adminId: adminId };
    const recipes = await RecipeModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return res.status(200).json({
      success: true,
      message: 'Your recipes retrieved successfully',
      data: recipes.slice(0, 3),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET A SINGLE RECIPE BY ID

export const getSingleRecipe = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const userRole = req.user?.role || 'user';

    const recipe = await RecipeModel.findById(id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }

    if (userRole === 'user' && recipe.isPublished === false) {
      return res.status(403).json({
        success: false,
        message: 'This recipe is not yet published',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Recipe retrieved successfully',
      data: recipe,
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
