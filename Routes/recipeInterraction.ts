import express from 'express';
import { completeCooking, didntCook, getCookingStatus, startCooking, trackStepCompletion } from '../controllers/recipeInterractionController/recipeIntteraction';
import { verifyToken } from '../middleware/authMIddleware';


const router = express.Router();

// Start cooking a recipe
router.post('/start', verifyToken, startCooking);

// Complete cooking (Done Cooking)
router.post('/complete', verifyToken, completeCooking);

// Didn't cook / Abandon
router.post('/didnt-cook', verifyToken, didntCook);

// Get cooking status for a recipe
router.get('/status/:recipeId', verifyToken, getCookingStatus);

// Track step completion (optional)
router.post('/step', verifyToken, trackStepCompletion);

export { router as recipeInterractionRouter };
