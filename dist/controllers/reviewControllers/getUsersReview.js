"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserReviewForRecipe = void 0;
const review_1 = __importDefault(require("../../models/review"));
// Get user's review for a specific recipe
const getUserReviewForRecipe = async (req, res) => {
    try {
        const userId = req.user._id;
        const { recipeId } = req.params;
        const review = await review_1.default.findOne({ recipeId, userId });
        return res.status(200).json({
            success: true,
            data: review
        });
    }
    catch (error) {
        console.error("Error getting user review:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get user review",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getUserReviewForRecipe = getUserReviewForRecipe;
