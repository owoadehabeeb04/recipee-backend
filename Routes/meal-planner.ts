import express from 'express';
import { verifyToken } from '../middleware/authMIddleware';
import { generateCategorizedShoppingList, generatePrintableShoppingList, generateShoppingList } from '../controllers/mealPlannersController/shoppinglist';
import { createMealPlan, deleteMealPlan, duplicateMealPlan, getMealPlan, getMealPlanByWeek, getUserMealPlans, updateMealPlan } from '../controllers/mealPlannersController/mealPlanner1';
import { getMealPlanStats } from '../controllers/mealPlannersController/mealplanner';
import { connectToGoogleCalendar, disconnectFromGoogleCalendar, syncMealPlanToCalendar } from '../controllers/mealPlannersController/googleMealPlanConnector';
import { getShoppingListWithStatus, resetShoppingList, updateShoppingListCheckedItems } from '../controllers/mealPlannersController/checkingMealPlanner';

const router = express.Router();

// All meal plan routes require authentication
router.use(verifyToken);

router.get('/by-week/:date', getMealPlanByWeek);

router.post('/', createMealPlan);
router.get('/', getUserMealPlans);
router.get('/:id', getMealPlan);
router.get('/:id/stats', getMealPlanStats)
router.patch('/:id', updateMealPlan);
router.post('/mealplans/:id/duplicate', verifyToken, duplicateMealPlan);
router.delete('/:id', deleteMealPlan);
router.post('/:id/calendar/connect', verifyToken, connectToGoogleCalendar);
router.post('/:id/calendar/disconnect', verifyToken, disconnectFromGoogleCalendar);
router.post('/:id/calendar/sync', verifyToken, syncMealPlanToCalendar);
// Shopping list routes
router.get('/:id/shopping-list', generateShoppingList);
router.get('/:id/shopping-list/categorized', generateCategorizedShoppingList);
router.get('/:id/shopping-list/printable', generatePrintableShoppingList);

router.get('/:id/shopping-list/status', verifyToken, getShoppingListWithStatus);
router.patch('/:id/shopping-list/check', verifyToken, updateShoppingListCheckedItems);
router.post('/:id/shopping-list/reset', verifyToken, resetShoppingList);

export { router as MealPlanRouter };