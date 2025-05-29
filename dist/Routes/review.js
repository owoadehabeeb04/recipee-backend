"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRouter = void 0;
const express_1 = __importDefault(require("express"));
// import {
//   createReview,
//   getRecipeReviews,
//   updateReview,
//   deleteReview,
//   getUserReviewForRecipe
// } from '../controllers/reviewController';
const authMIddleware_1 = require("../middleware/authMIddleware");
const createReview_1 = require("../controllers/reviewControllers/createReview");
const getReviews_1 = require("../controllers/reviewControllers/getReviews");
const updateReview_1 = require("../controllers/reviewControllers/updateReview");
const deleteReview_1 = require("../controllers/reviewControllers/deleteReview");
const getUsersReview_1 = require("../controllers/reviewControllers/getUsersReview");
const router = express_1.default.Router();
exports.reviewRouter = router;
// Create a review (requires authentication)
router.post('/', authMIddleware_1.verifyToken, createReview_1.createReview);
// Get reviews for a recipe (public)
router.get('/', getReviews_1.getRecipeReviews);
// Update a review (requires authentication)
router.patch('/', authMIddleware_1.verifyToken, updateReview_1.updateReview);
// Delete a review (requires authentication)
router.delete('/:reviewId', authMIddleware_1.verifyToken, deleteReview_1.deleteReview);
// Get user's review for a specific recipe (requires authentication)
router.get('/user/:recipeId', authMIddleware_1.verifyToken, getUsersReview_1.getUserReviewForRecipe);
