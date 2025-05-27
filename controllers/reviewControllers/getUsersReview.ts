import Review from "../../models/review";

// Get user's review for a specific recipe
export const getUserReviewForRecipe = async (req: any, res: any) => {
    try {
      const userId = req.user._id;
      const { recipeId } = req.params;
  
      const review = await Review.findOne({ recipeId, userId });
  
      return res.status(200).json({
        success: true,
        data: review
      });
  
    } catch (error) {
      console.error("Error getting user review:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get user review",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };
  