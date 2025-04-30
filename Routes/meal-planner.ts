import express from 'express';
import { verifyToken } from '../middleware/authMIddleware';
import { createMealPlan, deleteMealPlan, getMealPlan, getMealPlanByWeek, getUserMealPlans, updateMealPlan } from '../controllers/mealPlannersController/mealplanner';
import { generateCategorizedShoppingList, generatePrintableShoppingList, generateShoppingList } from '../controllers/mealPlannersController/shoppinglist';

const router = express.Router();

// All meal plan routes require authentication
router.use(verifyToken);

router.get('/by-week/:date', getMealPlanByWeek);

router.post('/', createMealPlan);
router.get('/', getUserMealPlans);
router.get('/:id', getMealPlan);
router.patch('/:id', updateMealPlan);
router.delete('/:id', deleteMealPlan);

// Shopping list routes
router.get('/:id/shopping-list', generateShoppingList);
router.get('/:id/shopping-list/categorized', generateCategorizedShoppingList);
router.get('/:id/shopping-list/printable', generatePrintableShoppingList);

export { router as MealPlanRouter };