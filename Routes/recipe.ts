import express from 'express';
import {
  createRecipe,
  getAllRecipes,
  getSingleRecipe,
  getStatistics,
  getUserRecipes,
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
  isAdminOrUser,
  isSuperAdmin,
  isUser,
  optionalAuth,
  verifyToken,
} from '../middleware/authMIddleware';
import { deleteUserRecipe, editUserRecipe } from '../controllers/userRecipesController';

const router = express.Router();

/**
 * ORDER IS CRITICAL IN EXPRESS ROUTES!
 * More specific routes must come BEFORE generic ones.
 */

// 1. First, the root GET route
router.get('/', optionalAuth, getAllRecipes);

// 2. Then all specific named GET routes
router.get('/', verifyToken, isUser, getUserRecipes);
router.get('/recipeStats', verifyToken, getStatistics);
router.get('/recentRecipes', verifyToken, getYourRecentRecipes);
router.get('/adminRecipes', verifyToken, isAdmin, getAdminRecipes);


router.post('/create-recipe', verifyToken, isAdminOrUser, createRecipe);
router.patch('/user/edit-recipe/:id', verifyToken, isAdminOrUser, editUserRecipe);
router.delete('/user/delete-recipe/:id', verifyToken, isAdminOrUser, deleteUserRecipe);


// 3. Then all specific POST, PATCH, DELETE routes
router.post('/create-recipe', verifyToken, isAdminOrUser, createRecipe);
router.patch('/edit-recipe/:id', verifyToken, isAdmin, editRecipe);
router.delete('/delete-recipe/:id', verifyToken, isAdmin, deleteRecipe);
router.patch('/publish/:id', verifyToken, isSuperAdmin, togglePublishStatus);

// 4. LASTLY, the generic ID route - this must be LAST!
router.get('/:id', optionalAuth, getSingleRecipe);

export { router as RecipeRouter };
