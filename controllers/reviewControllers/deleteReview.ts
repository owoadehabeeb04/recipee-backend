import Review from "../../models/review";
import { updateRecipeRatingAggregation } from "./createReview";

// Delete a review
export const deleteReview = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { reviewId } = req.params;

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
        message: "You can only delete your own reviews"
      });
    }

    const recipeId = review.recipeId;

    // Delete the review
    await Review.findByIdAndDelete(reviewId);

    // Update recipe aggregation data
    await updateRecipeRatingAggregation(recipeId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting review:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
