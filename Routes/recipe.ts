import express, { Request } from 'express';
import {
  createRecipe,
  getAllRecipes,
  getSingleRecipe,
  getStatistics,
  getYourRecentRecipes,
} from '../controllers/recipesController';
import {
  deleteRecipe,
  editRecipe,
  getAdminRecipes,
} from '../controllers/adminRecipesController';
import {
  isAdmin,
  optionalAuth,
  verifyToken,
} from '../middleware/authMIddleware';

const router = express.Router();

// Protected routes (require user authentication)
router.get('/recipeStats', verifyToken, getStatistics);
router.get('/recentRecipes', verifyToken, getYourRecentRecipes);

// Admin-only routes
router.patch('/edit-recipe', verifyToken, isAdmin, editRecipe);
router.post('/create-recipe', verifyToken, isAdmin, createRecipe);
router.delete('/delete-recipe', verifyToken, isAdmin, deleteRecipe);
router.get('/adminRecipes', verifyToken, isAdmin, getAdminRecipes);

// Public routes (no authentication needed)
router.get('/', optionalAuth, getAllRecipes);
router.get('/:id', optionalAuth, getSingleRecipe);

// Super-admin only routes (if needed)
// router.post('/recipes/special-operation', verifyToken, isSuperAdmin, specialOperation)

export { router as RecipeRouter };
