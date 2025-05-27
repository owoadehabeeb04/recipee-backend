import Review from "../../models/review";
import { updateRecipeRatingAggregation } from "./createReview";

// Update a review
export const updateReview = async (req: any, res: any) => {
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
      const review = await Review.findById(reviewId);
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
      await updateRecipeRatingAggregation(review.recipeId);
  
      return res.status(200).json({
        success: true,
        message: "Review updated successfully",
        data: review
      });
  
    } catch (error) {
      console.error("Error updating review:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update review",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };