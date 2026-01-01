import { Express } from 'express';

import mongoose from 'mongoose';
import RecipeModel from '../../models/recipe';
import UserModel from '../../models/user';
import FavoriteModel from '../../models/favoriteRecipe';
import { AdminRecipeData, BaseRecipeData, UserRecipeData } from '../../types';
import { addToFavorites } from '../favoritesController';

// GET ALL RECIPES
export const getAllRecipes = async (req: any, res: any) => {
  console.log('GETTING ALL RECIPES');
  try {
    const userId = req.user?._id;
    
    // pagination to prevent bulky recipes
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const category = req.query.category as string;
    const sort = (req.query.sort as string) || 'newest';
    
    // Get meal type filter parameters
    const breakfast = req.query.breakfast === 'true';
    const lunch = req.query.lunch === 'true';
    const dinner = req.query.dinner === 'true';
    const favorites = req.query.favorites === 'true';

    const userRole = req.user?.role || 'public';
    
    // Simplify query structure
    let query: any = {};
    
    // Handle role-based visibility
    if (userRole === 'admin' || userRole === 'super_admin') {
      // Simpler query for admins - they can see all admin recipes and public user recipes
      query.$or = [
        { roleCreated: 'admin' },
        { roleCreated: 'user', isPrivate: false },
      ];
      
      // Only add user-specific condition if userId exists
      if (userId) {
        query.$or.push({ user: userId });
      }
    } else if (userRole === 'user' && userId) {
      // For logged in users
      query.$or = [
        { isPublished: true, isPrivate: false },
        { user: userId }
      ];
    } else {
      // For public access
      query.isPublished = true;
      query.isPrivate = false;
    }

    // Handle favorites filter
    if (favorites && userId) {
      const favoritesList = await FavoriteModel.find({ user: userId }).select('recipe');
      const favoriteRecipeIds = favoritesList.map((fav: any) => fav.recipe);
      
      if (favoriteRecipeIds.length === 0) {
        // No favorites found, return empty result
        return res.status(200).json({
          success: true,
          status: 200,
          message: 'Recipes retrieved successfully',
          data: [],
          pagination: {
            limit,
            page,
            total: 0,
            pages: 0,
          },
        });
      }
      
      // Add favorite recipe IDs to query
      if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },
            { _id: { $in: favoriteRecipeIds } }
          ]
        };
      } else {
        query._id = { $in: favoriteRecipeIds };
      }
    }

    // Filter by meal type (breakfast, lunch, dinner)
    const mealTypeFilters: string[] = [];
    if (breakfast) mealTypeFilters.push('breakfast');
    if (lunch) mealTypeFilters.push('lunch');
    if (dinner) mealTypeFilters.push('dinner');

    // Add category filter if provided (either from category param or meal type filters)
    const categoryFilter = category || (mealTypeFilters.length > 0 ? mealTypeFilters : null);
    
    if (categoryFilter) {
      if (Array.isArray(categoryFilter) || mealTypeFilters.length > 0) {
        const categoriesToFilter = Array.isArray(categoryFilter) ? categoryFilter : mealTypeFilters;
        if (query.$and) {
          query.$and.push({ category: { $in: categoriesToFilter } });
        } else if (query.$or) {
          query = {
            $and: [
              { $or: query.$or },
              { category: { $in: categoriesToFilter } }
            ]
          };
        } else {
          query.category = { $in: categoriesToFilter };
        }
      } else {
        if (query.$or) {
          query = {
            $and: [
              { $or: query.$or },
              { category: categoryFilter }
            ]
          };
        } else {
          query.category = categoryFilter;
        }
      }
    }

    // Add search filter if provided
    if (search) {
      const searchQuery = { 
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
      
      if (query.$and) {
        query.$and.push(searchQuery);
      } else if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },
            searchQuery
          ]
        };
      } else {
        query = searchQuery;
      }
    }

    console.log('Query:', JSON.stringify(query, null, 2));

    // Set timeout option for queries
    const options = { maxTimeMS: 20000 }; // 20 seconds timeout
    
    // Use Promise.all to run both queries in parallel
    const [recipes, total] = await Promise.all([
      RecipeModel.find(query, null, options)
        .sort(getSortOptions(sort))
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean() for better performance
      
      RecipeModel.countDocuments(query, options)
    ]);

    console.log(`Found ${recipes.length} recipes out of ${total} total`);

    return res.status(200).json({
      success: true,
      status: 200,
      message: 'Recipes retrieved successfully',
      data: recipes,
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
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper function to get sort options
function getSortOptions(sort: string): { [key: string]: 1 | -1 } {
  switch (sort) {
    case 'oldest': return { createdAt: 1 };
    case 'title': return { title: 1 };
    case 'rating': return { averageRating: -1 };
    default: return { createdAt: -1 }; // newest by default
  }
}
// CREATE A RECIPE
export const createRecipe = async (req: any, res: any) => {
  console.log('CREATE RECIPE FUNCTION CALLED');
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
      nutrition,
      isPrivate = false,
    } = req.body;
    
    const userId = req.user._id;
    const userRole = req.user.role;
    
    console.log('User role:', userRole);
    console.log('User ID:', userId);

    // Handle nutrition data
    const nutritionData = {
      calories: Number(nutrition?.calories || 0),
      protein: Number(nutrition?.protein || 0),
      carbs: Number(nutrition?.carbs || 0),
      fat: Number(nutrition?.fat || 0),
      fiber: Number(nutrition?.fiber || 0),
      sugar: Number(nutrition?.sugar || 0)
    };


    // Start with base recipe data
    const baseRecipeData: BaseRecipeData = {
      title,
      description,
      category,
      cookingTime,
      difficulty: difficulty || 'medium',
      servings,
      ingredients,
      steps,
      featuredImage: featuredImage || '',
      tips,
      nutrition: nutritionData,
      isPrivate: userRole === 'admin' ? false : (isPrivate || false),
      isPublished: false,
      roleCreated: userRole
    };
    
    // Create the final recipe data with proper type
    let recipeData: AdminRecipeData | UserRecipeData;
    
    if (userRole === 'admin' || userRole === 'super_admin') {
      recipeData = {
        ...baseRecipeData,
        admin: userId,
        adminId: userId,
        adminDetails: {
          name: req.user.username || req.user.name,
          email: req.user.email,
          role: req.user.role
        }
      };
      console.log('Added admin fields');
    } else {
      recipeData = {
        ...baseRecipeData,
        user: userId,
        userDetails: {
          name: req.user.username || req.user.name,
          email: req.user.email,
          role: req.user.role
        }
      };
      console.log('Added user field');
    }
    
    console.log('Recipe data prepared:', JSON.stringify(recipeData, null, 2));
    
    // Create and save the recipe
    const newRecipe = new RecipeModel(recipeData);
    const savedRecipe = await newRecipe.save();
    
    console.log('Recipe saved successfully with ID:', savedRecipe._id);

if (userRole === 'user') {
  try {
    const mockReq = {
      body: { recipeId: savedRecipe._id },
      user: { _id: userId }
    };
    
    // Create a response object that won't actually send anything to the client
    const mockRes = {
      status: function(statusCode: any) {
        console.log(`Favorite add status: ${statusCode}`);
        return this;
      },
      json: function(data: { success: any; message: any; }) {
        if (data.success) {
          console.log(`Added recipe ${savedRecipe._id} to user ${userId}'s favorites`);
        } else {
          console.log(`Note: ${data.message}`);
        }
        return data;
      }
    };
    
    // Call the existing controller function
    await addToFavorites(mockReq, mockRes);
    
  } catch (favError) {
    // Don't fail the whole request if adding to favorites fails
    console.error('Error adding recipe to favorites:', favError);
  }
}
    return res.status(201).json({
      success: true,
      message: 'Recipe created!',
      data: savedRecipe,
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to create recipe', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
// GET RECIPE STATISTICS
export const getStatistics = async (req: any, res: any) => {
  console.log('get statistics i pray it gets here ');
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
    const userId = req.user?._id;
    const userRole = req.user?.role || 'public'; // Default to 'public' if not logged in
    
    console.log(`Getting recipe ${id} for user ${userId} with role ${userRole}`);

    // Validate ObjectId format
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID format'
      });
    }

    const recipe = await RecipeModel.findById(id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }

    // Check access permissions:
    // 1. Admins can see any recipe
    // 2. Users can see:
    //    - Any published recipe 
    //    - Their own recipes (published or not)
    // 3. Public users can only see published recipes
    
    if (userRole === 'admin' || userRole === 'super_admin') {
      // Admins can see everything
      console.log('Admin access - showing recipe');
    } else if (userRole === 'user') {
      // For regular users:
      const isOwnRecipe = recipe.user && recipe.user.toString() === userId?.toString();
      
      if (!recipe.isPublished && !isOwnRecipe) {
        console.log('Access denied - recipe not published and not owned by this user');
        return res.status(403).json({
          success: false,
          message: 'This recipe is not yet published',
        });
      }
      
      console.log(`User access - ${isOwnRecipe ? 'showing own recipe' : 'showing published recipe'}`);
    } else {
      // Public access
      if (!recipe.isPublished || recipe.isPrivate) {
        console.log('Public access denied - recipe not published or is private');
        return res.status(403).json({
          success: false,
          message: 'This recipe is not available',
        });
      }
      console.log('Public access - showing published recipe');
    }

    return res.status(200).json({
      success: true,
      message: 'Recipe retrieved successfully',
      data: recipe,
      // Include an indicator if this is the user's own recipe
      isOwnRecipe: userRole === 'user' && recipe.user && recipe.user.toString() === userId?.toString()
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

// GET ALL USER RECIPES
export const getUserRecipes = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    // pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get filter parameters
    const breakfast = req.query.breakfast === 'true';
    const lunch = req.query.lunch === 'true';
    const dinner = req.query.dinner === 'true';
    const favorites = req.query.favorites === 'true';

    // Filter by meal type (breakfast, lunch, dinner)
    const mealTypeFilters: string[] = [];
    if (breakfast) mealTypeFilters.push('breakfast');
    if (lunch) mealTypeFilters.push('lunch');
    if (dinner) mealTypeFilters.push('dinner');

    // Build query
    let query: any = {};

    // If filtering by favorites, get favorite recipe IDs first
    if (favorites) {
      const favoritesList = await FavoriteModel.find({ user: userId }).select('recipe');
      const favoriteRecipeIds = favoritesList.map((fav: any) => fav.recipe);
      
      if (favoriteRecipeIds.length === 0) {
        // No favorites found, return empty result
        return res.status(200).json({
          success: true,
          message: 'Your recipes retrieved successfully',
          data: [],
          pagination: {
            limit,
            page,
            total: 0,
            pages: 0,
          },
          filters: {
            breakfast: breakfast || undefined,
            lunch: lunch || undefined,
            dinner: dinner || undefined,
            favorites: favorites || undefined,
          },
        });
      }

      // Filter by favorite recipe IDs
      query._id = { $in: favoriteRecipeIds };

      // Add category filter if meal type filters are specified
      if (mealTypeFilters.length > 0) {
        query.category = { $in: mealTypeFilters };
      }
    } else {
      // Default: get recipes created by the user
      query.user = userId;

      // Add category filter if meal type filters are specified
      if (mealTypeFilters.length > 0) {
        query.category = { $in: mealTypeFilters };
      }
    }

    // Count total matching recipes
    const total = await RecipeModel.countDocuments(query);

    // Get recipes
    const recipes = await RecipeModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Your recipes retrieved successfully',
      data: recipes,
      pagination: {
        limit,
        page,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        breakfast: breakfast || undefined,
        lunch: lunch || undefined,
        dinner: dinner || undefined,
        favorites: favorites || undefined,
      },
    });
  } catch (error) {
    console.error('Error getting user recipes:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
};
