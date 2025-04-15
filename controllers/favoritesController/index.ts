import FavoriteModel from '../../models/favoriteRecipe';
import RecipeModel from '../../models/recipe';

export const addToFavorites = async (req: any, res: any) => {
  try {
    const { recipeId } = req.body;
    const userId = req.user._id;

    const existingFavorite = await FavoriteModel.findOne({
      user: userId,
      recipe: recipeId,
    });

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Recipe already in favorites',
      });
    }

    const recipeExists = await RecipeModel.exists({ _id: recipeId });
    if (!recipeExists) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }
    const newFavorite = new FavoriteModel({
      user: userId,
      recipe: recipeId,
    });
    await newFavorite.save();

    return res.status(201).json({
      success: true,
      message: 'Recipe added to favorites',
      data: newFavorite,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Recipe already in favorites',
      });
    }

    console.error('Error in addToFavorite:', error);
    return res.status(500).json({
      message: 'server error',
    });
  }
};

export const removeFavorite = async (req: any, res: any) => {
  try {
    const { recipeId } = req.params;
    const userId = req.user._id;

    const favoriteExists = await FavoriteModel.findOne({
      user: userId,
      recipe: recipeId,
    });
    if (!favoriteExists) {
      return res.status(400).json({
        success: false,
        message: 'This recipe has not been added to your favorites',
      });
    }

    const result = await FavoriteModel.findOneAndDelete({
      user: userId,
      recipe: recipeId,
    });

    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'Recipe not found in favorites',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Recipe removed from favorites',
    });
  } catch (error) {
    console.error('Error in remove favorite:', error);
    return res.status(500).json({
      message: 'server error',
    });
  }
};

export const getAllFavorites = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get search and category from query string
    const search = req.query.search as string;
    const category = req.query.category as string;
    const sort = (req.query.sort as string) || 'newest';

    // IMPORTANT: First build the base query to only get current user's favorites
    const query: any = { user: userId };
    
    // Step 1: If we have search or category filters, we need to find matching recipe IDs first
    if (search || category) {
      // Build a recipe query to find matching recipes
      const recipeQuery: any = {};
      
      // Add category filter to recipe query if provided
      if (category) {
        recipeQuery.category = category;
      }
      
      // Add search filter to recipe query if provided
      if (search) {
        recipeQuery.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }
      
      // Find all recipe IDs that match our criteria
      const matchingRecipes = await RecipeModel.find(recipeQuery).select('_id');
      
      // Extract just the IDs
      const recipeIds = matchingRecipes.map(recipe => recipe._id);
      
      // If we have matching recipes, add them to our favorites query
      if (recipeIds.length > 0) {
        // Only include favorites with these recipe IDs
        query.recipe = { $in: recipeIds };
      } else {
        // No recipes match our criteria, so return empty result
        return res.status(200).json({
          success: true,
          message: 'No favorites match the search criteria',
          data: [],
          pagination: {
            limit,
            page,
            total: 0,
            pages: 0,
          },
        });
      }
    }
    
    // Count the total number of matching favorites with our updated query
    const total = await FavoriteModel.countDocuments(query);
    
    // Set up sorting options
    let sortOptions: any = {};
    switch (sort) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      // We'll handle title and rating sorting after population
      default:
        sortOptions = { createdAt: -1 }; // newest by default
    }
    
    // Get favorites with populated recipe and user data
    const favoriteRecipes = await FavoriteModel.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('recipe') // Get all recipe data
      .populate({
        path: 'user',
        select: 'username email' // Only select necessary user fields
      });
    
    // Handle sorting that requires populated data
    let sortedFavorites = [...favoriteRecipes];
    
    if (sort === 'title' && sortedFavorites.length > 0) {
      sortedFavorites.sort((a, b) => {
        return a.recipe?.title.localeCompare(b.recipe?.title) || 0;
      });
    } else if (sort === 'rating' && sortedFavorites.length > 0) {
      // sortedFavorites.sort((a, b) => {
      //   const ratingA = a.recipe?.averageRating || 0;
      //   const ratingB = b.recipe?.averageRating || 0;
      //   return ratingB - ratingA; // Higher ratings first
      // });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Favorite recipes retrieved successfully',
      data: sortedFavorites,
      pagination: {
        limit,
        page,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error in getAllFavorites:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
export const checkFavoriteStatus = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { recipeId } = req.params;

    const favorite = await FavoriteModel.findOne({
      user: userId,
      recipe: recipeId,
    });

    return res.status(200).json({
      success: true,
      isFavorited: !!favorite,
    });
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
