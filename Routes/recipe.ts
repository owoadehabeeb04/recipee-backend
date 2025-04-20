import express from 'express';
import {
  createRecipe,
  getAllRecipes,
  getSingleRecipe,
  getStatistics,
  getYourRecentRecipes,
} from '../controllers/allRecipesController/recipesController';
import {
  deleteRecipe,
  editRecipe,
  getAdminRecipes,
  togglePublishStatus,
} from '../controllers/allRecipesController/adminRecipesController';
import {
  isAdmin,
  isSuperAdmin,
  optionalAuth,
  verifyToken,
} from '../middleware/authMIddleware';

const router = express.Router();

/**
 * PUBLIC ROUTES
 * No authentication required
 */
router.get('/', optionalAuth, getAllRecipes);
router.get('/:id', optionalAuth, getSingleRecipe);

/**
 * AUTHENTICATED USER ROUTES
 * Requires valid JWT token
 */
router.get('/recipeStats', verifyToken, getStatistics);
router.get('/recentRecipes', verifyToken, getYourRecentRecipes);

/**
 * ADMIN ROUTES
 * Requires admin or super_admin role
 */
router.post('/create-recipe', verifyToken, isAdmin, createRecipe);
router.patch('/edit-recipe/:id', verifyToken, isAdmin, editRecipe);
router.delete('/delete-recipe/:id', verifyToken, isAdmin, deleteRecipe);
router.get('/adminRecipes', verifyToken, isAdmin, getAdminRecipes);

/**
 * SUPER ADMIN ROUTES
 * Requires super_admin role
 */
router.patch('/publish/:id', verifyToken, isSuperAdmin, togglePublishStatus);

export { router as RecipeRouter };