"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MealPlanRouter = void 0;
const express_1 = __importDefault(require("express"));
const authMIddleware_1 = require("../middleware/authMIddleware");
const mealplanner_1 = require("../controllers/mealPlannersController/mealplanner");
const shoppinglist_1 = require("../controllers/mealPlannersController/shoppinglist");
const router = express_1.default.Router();
exports.MealPlanRouter = router;
// All meal plan routes require authentication
router.use(authMIddleware_1.verifyToken);
router.get('/by-week/:date', mealplanner_1.getMealPlanByWeek);
router.post('/', mealplanner_1.createMealPlan);
router.get('/', mealplanner_1.getUserMealPlans);
router.get('/:id', mealplanner_1.getMealPlan);
router.patch('/:id', mealplanner_1.updateMealPlan);
router.delete('/:id', mealplanner_1.deleteMealPlan);
// Shopping list routes
router.get('/:id/shopping-list', shoppinglist_1.generateShoppingList);
router.get('/:id/shopping-list/categorized', shoppinglist_1.generateCategorizedShoppingList);
router.get('/:id/shopping-list/printable', shoppinglist_1.generatePrintableShoppingList);
