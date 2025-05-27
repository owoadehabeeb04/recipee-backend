import express from 'express';
// import {
//   createReview,
//   getRecipeReviews,
//   updateReview,
//   deleteReview,
//   getUserReviewForRecipe
// } from '../controllers/reviewController';
import { verifyToken } from '../middleware/authMIddleware';
import { createReview } from '../controllers/reviewControllers/createReview';
import { getRecipeReviews } from '../controllers/reviewControllers/getReviews';
import { updateReview } from '../controllers/reviewControllers/updateReview';
import { deleteReview } from '../controllers/reviewControllers/deleteReview';
import { getUserReviewForRecipe } from '../controllers/reviewControllers/getUsersReview';

const router = express.Router();

// Create a review (requires authentication)
router.post('/', verifyToken, createReview);

// Get reviews for a recipe (public)
router.get('/', getRecipeReviews);

// Update a review (requires authentication)
router.patch('/', verifyToken, updateReview);

// Delete a review (requires authentication)
router.delete('/:reviewId', verifyToken, deleteReview);

// Get user's review for a specific recipe (requires authentication)
router.get('/user/:recipeId', verifyToken, getUserReviewForRecipe);

export { router as reviewRouter };
