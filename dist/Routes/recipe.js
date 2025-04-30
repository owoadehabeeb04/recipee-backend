"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeRouter = void 0;
const express_1 = __importDefault(require("express"));
const recipesController_1 = require("../controllers/allRecipesController/recipesController");
const adminRecipesController_1 = require("../controllers/allRecipesController/adminRecipesController");
const authMIddleware_1 = require("../middleware/authMIddleware");
const userRecipesController_1 = require("../controllers/userRecipesController");
const router = express_1.default.Router();
exports.RecipeRouter = router;
/**
 * ORDER IS CRITICAL IN EXPRESS ROUTES!
 * More specific routes must come BEFORE generic ones.
 */
// 1. First, the root GET route
router.get('/', authMIddleware_1.optionalAuth, recipesController_1.getAllRecipes);
// 2. Then all specific named GET routes
router.get('/', authMIddleware_1.verifyToken, authMIddleware_1.isUser, recipesController_1.getUserRecipes);
router.get('/recipeStats', authMIddleware_1.verifyToken, recipesController_1.getStatistics);
router.get('/recentRecipes', authMIddleware_1.verifyToken, recipesController_1.getYourRecentRecipes);
router.get('/adminRecipes', authMIddleware_1.verifyToken, authMIddleware_1.isAdmin, adminRecipesController_1.getAdminRecipes);
router.post('/create-recipe', authMIddleware_1.verifyToken, authMIddleware_1.isAdminOrUser, recipesController_1.createRecipe);
router.patch('/user/edit-recipe/:id', authMIddleware_1.verifyToken, authMIddleware_1.isAdminOrUser, userRecipesController_1.editUserRecipe);
router.delete('/user/delete-recipe/:id', authMIddleware_1.verifyToken, authMIddleware_1.isAdminOrUser, userRecipesController_1.deleteUserRecipe);
// 3. Then all specific POST, PATCH, DELETE routes
router.post('/create-recipe', authMIddleware_1.verifyToken, authMIddleware_1.isAdminOrUser, recipesController_1.createRecipe);
router.patch('/edit-recipe/:id', authMIddleware_1.verifyToken, authMIddleware_1.isAdmin, adminRecipesController_1.editRecipe);
router.delete('/delete-recipe/:id', authMIddleware_1.verifyToken, authMIddleware_1.isAdmin, adminRecipesController_1.deleteRecipe);
router.patch('/publish/:id', authMIddleware_1.verifyToken, authMIddleware_1.isSuperAdmin, adminRecipesController_1.togglePublishStatus);
// 4. LASTLY, the generic ID route - this must be LAST!
router.get('/:id', authMIddleware_1.optionalAuth, recipesController_1.getSingleRecipe);
