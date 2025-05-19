"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MealPlanRouter = void 0;
const express_1 = __importDefault(require("express"));
const authMIddleware_1 = require("../middleware/authMIddleware");
const shoppinglist_1 = require("../controllers/mealPlannersController/shoppinglist");
const mealPlanner1_1 = require("../controllers/mealPlannersController/mealPlanner1");
const mealplanner_1 = require("../controllers/mealPlannersController/mealplanner");
const googleMealPlanConnector_1 = require("../controllers/mealPlannersController/googleMealPlanConnector");
const checkingMealPlanner_1 = require("../controllers/mealPlannersController/checkingMealPlanner");
const router = express_1.default.Router();
exports.MealPlanRouter = router;
// All meal plan routes require authentication
router.use(authMIddleware_1.verifyToken);
router.get('/by-week/:date', mealPlanner1_1.getMealPlanByWeek);
router.post('/', mealPlanner1_1.createMealPlan);
router.get('/', mealPlanner1_1.getUserMealPlans);
router.get('/:id', mealPlanner1_1.getMealPlan);
router.get('/:id/stats', mealplanner_1.getMealPlanStats);
router.patch('/:id', mealPlanner1_1.updateMealPlan);
router.post('/mealplans/:id/duplicate', authMIddleware_1.verifyToken, mealPlanner1_1.duplicateMealPlan);
router.delete('/:id', mealPlanner1_1.deleteMealPlan);
router.post('/:id/calendar/connect', authMIddleware_1.verifyToken, googleMealPlanConnector_1.connectToGoogleCalendar);
router.post('/:id/calendar/disconnect', authMIddleware_1.verifyToken, googleMealPlanConnector_1.disconnectFromGoogleCalendar);
router.post('/:id/calendar/sync', authMIddleware_1.verifyToken, googleMealPlanConnector_1.syncMealPlanToCalendar);
// Shopping list routes
router.get('/:id/shopping-list', shoppinglist_1.generateShoppingList);
router.get('/:id/shopping-list/categorized', shoppinglist_1.generateCategorizedShoppingList);
router.get('/:id/shopping-list/printable', shoppinglist_1.generatePrintableShoppingList);
router.get('/:id/shopping-list/status', authMIddleware_1.verifyToken, checkingMealPlanner_1.getShoppingListWithStatus);
router.patch('/:id/shopping-list/check', authMIddleware_1.verifyToken, checkingMealPlanner_1.updateShoppingListCheckedItems);
router.post('/:id/shopping-list/reset', authMIddleware_1.verifyToken, checkingMealPlanner_1.resetShoppingList);
