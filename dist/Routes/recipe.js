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
const router = express_1.default.Router();
exports.RecipeRouter = router;
// Protected routes (require user authentication)
router.get('/recipeStats', authMIddleware_1.verifyToken, recipesController_1.getStatistics);
router.get('/recentRecipes', authMIddleware_1.verifyToken, recipesController_1.getYourRecentRecipes);
// Admin-only routes
router.patch('/edit-recipe/:id', authMIddleware_1.verifyToken, authMIddleware_1.isAdmin, adminRecipesController_1.editRecipe);
router.post('/create-recipe', authMIddleware_1.verifyToken, authMIddleware_1.isAdmin, recipesController_1.createRecipe);
router.delete('/delete-recipe/:id', authMIddleware_1.verifyToken, authMIddleware_1.isAdmin, adminRecipesController_1.deleteRecipe);
router.get('/adminRecipes', authMIddleware_1.verifyToken, authMIddleware_1.isAdmin, adminRecipesController_1.getAdminRecipes);
// super admin only routes
router.patch('/publish/:id', authMIddleware_1.verifyToken, authMIddleware_1.isSuperAdmin, adminRecipesController_1.togglePublishStatus);
// Public routes (no authentication needed)
router.get('/', authMIddleware_1.optionalAuth, recipesController_1.getAllRecipes);
router.get('/:id', authMIddleware_1.optionalAuth, recipesController_1.getSingleRecipe);
