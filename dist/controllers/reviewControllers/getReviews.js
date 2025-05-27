"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecipeReviews = void 0;
const recipe_1 = __importDefault(require("../../models/recipe"));
const review_1 = __importDefault(require("../../models/review"));
const getRecipeReviews = async (req, res) => {
    try {
        const { recipeId } = req.query;
        const { cursor, // timestamp of last review for infinite scroll
        limit = 10, sortBy = 'rating', // 'rating', 'createdAt', 'helpful'
        sortOrder = 'desc' } = req.query;
        if (!recipeId) {
            return res.status(400).json({
                success: false,
                message: "Recipe ID is required"
            });
        }
        // Build query for cursor-based pagination
        let query = { recipeId };
        // If cursor exists, add it to query for infinite scroll
        if (cursor) {
            if (sortBy === 'rating') {
                // For rating sort, we need compound cursor (rating + createdAt)
                query.$or = [
                    { rating: { $lt: cursor.split('_')[0] } },
                    {
                        rating: cursor.split('_')[0],
                        createdAt: { $lt: new Date(cursor.split('_')[1]) }
                    }
                ];
            }
            else if (sortBy === 'helpful') {
                query.$or = [
                    { helpfulCount: { $lt: cursor.split('_')[0] } },
                    {
                        helpfulCount: cursor.split('_')[0],
                        createdAt: { $lt: new Date(cursor.split('_')[1]) }
                    }
                ];
            }
            else {
                // For createdAt sort (newest)
                query.createdAt = { $lt: new Date(cursor) };
            }
        }
        // Build sort options based on filter
        let sortOptions = {};
        if (sortBy === 'rating') {
            sortOptions = { rating: -1, createdAt: -1 }; // Highest rated first, then newest
        }
        else if (sortBy === 'helpful') {
            sortOptions = { helpfulCount: -1, createdAt: -1 }; // Most helpful first
        }
        else {
            sortOptions = { createdAt: -1 }; // Newest first
        }
        const batchSize = Number(limit);
        // Get one extra to check if there are more reviews
        const reviews = await review_1.default.find(query)
            .sort(sortOptions)
            .limit(batchSize + 1)
            .lean();
        // Check if there are more reviews
        const hasMore = reviews.length > batchSize;
        if (hasMore) {
            reviews.pop(); // Remove the extra review
        }
        // Generate next cursor for infinite scroll
        let nextCursor = null;
        if (hasMore && reviews.length > 0) {
            const lastReview = reviews[reviews.length - 1];
            if (sortBy === 'rating') {
                nextCursor = `${lastReview.rating}_${lastReview.createdAt.toISOString()}`;
            }
            else if (sortBy === 'helpful') {
                nextCursor = `${lastReview.helpfulCount}_${lastReview.createdAt.toISOString()}`;
            }
            else {
                nextCursor = lastReview.createdAt.toISOString();
            }
        }
        // Get recipe aggregation data (only on first load)
        let aggregation = null;
        if (!cursor) {
            const recipe = await recipe_1.default.findById(recipeId, 'averageRating totalReviews ratingDistribution');
            aggregation = recipe ? {
                averageRating: recipe.averageRating || 0,
                totalReviews: recipe.totalReviews || 0,
                ratingDistribution: recipe.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            } : null;
        }
        return res.status(200).json({
            success: true,
            message: "Reviews retrieved successfully",
            data: {
                reviews,
                hasMore,
                nextCursor,
                currentFilter: sortBy,
                aggregation // Only included on first load
            }
        });
    }
    catch (error) {
        console.error("Error getting reviews:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get reviews",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getRecipeReviews = getRecipeReviews;
