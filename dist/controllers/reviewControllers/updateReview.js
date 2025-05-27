"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReview = void 0;
const review_1 = __importDefault(require("../../models/review"));
const createReview_1 = require("./createReview");
// Update a review
const updateReview = async (req, res) => {
    try {
        const userId = req.user._id;
        const { reviewId } = req.body;
        const { rating, comment } = req.body;
        if (!reviewId) {
            return res.status(400).json({
                success: false,
                message: "Review ID is required"
            });
        }
        // Find the review
        const review = await review_1.default.findById(reviewId);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found"
            });
        }
        // Check if user owns this review
        if (review.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only update your own reviews"
            });
        }
        // Update fields if provided
        if (rating !== undefined) {
            if (rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    message: "Rating must be between 1 and 5"
                });
            }
            review.rating = rating;
        }
        if (comment !== undefined) {
            review.comment = comment.trim();
        }
        await review.save();
        // Update recipe aggregation data
        await (0, createReview_1.updateRecipeRatingAggregation)(review.recipeId);
        return res.status(200).json({
            success: true,
            message: "Review updated successfully",
            data: review
        });
    }
    catch (error) {
        console.error("Error updating review:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update review",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.updateReview = updateReview;
