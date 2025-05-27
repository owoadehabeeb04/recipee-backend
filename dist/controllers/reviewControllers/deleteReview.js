"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReview = void 0;
const review_1 = __importDefault(require("../../models/review"));
const createReview_1 = require("./createReview");
// Delete a review
const deleteReview = async (req, res) => {
    try {
        const userId = req.user._id;
        const { reviewId } = req.params;
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
                message: "You can only delete your own reviews"
            });
        }
        const recipeId = review.recipeId;
        // Delete the review
        await review_1.default.findByIdAndDelete(reviewId);
        // Update recipe aggregation data
        await (0, createReview_1.updateRecipeRatingAggregation)(recipeId);
        return res.status(200).json({
            success: true,
            message: "Review deleted successfully"
        });
    }
    catch (error) {
        console.error("Error deleting review:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete review",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.deleteReview = deleteReview;
