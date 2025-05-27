import MealPlan from "../../models/meal-planner";
import RecipeInteraction from "../../models/recipeInterractionModel";


// Start cooking a recipe
export const startCooking = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { recipeId, fromMealPlan = false, mealPlanId = null } = req.body;

    if (!recipeId) {
      return res.status(400).json({
        success: false,
        message: "Recipe ID is required"
      });
    }

    // Check if user already has an active cooking session for this recipe
    const existingSession = await RecipeInteraction.findOne({
      userId,
      recipeId,
      status: { $in: ['started_cooking', 'cooking_in_progress'] }
    });

    let interaction;

    if (existingSession) {
      // Resume existing session
      interaction = existingSession;
      interaction.actions.push({
        type: 'started_cooking',
        timestamp: new Date()
      });
    } else {
      // Create new cooking session
      interaction = new RecipeInteraction({
        userId,
        recipeId,
        status: 'started_cooking',
        fromMealPlan,
        mealPlanId,
        startedAt: new Date(),
        actions: [
          {
            type: 'started_cooking',
            timestamp: new Date()
          }
        ]
      });
    }

    await interaction.save();

    return res.status(200).json({
      success: true,
      message: "Cooking session started",
      data: {
        sessionId: interaction.sessionId,
        status: interaction.status,
        startedAt: interaction.startedAt
      }
    });

  } catch (error) {
    console.error("Error starting cooking session:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start cooking session",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Complete cooking (Done Cooking)
export const completeCooking = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { recipeId, sessionId, cookingTime, rating, notes } = req.body;

    if (!recipeId) {
      return res.status(400).json({
        success: false,
        message: "Recipe ID is required"
      });
    }

    // Find the cooking session
    const interaction = await RecipeInteraction.findOne({
      userId,
      recipeId,
      sessionId: sessionId || { $exists: true },
      status: { $in: ['started_cooking', 'cooking_in_progress'] }
    }).sort({ createdAt: -1 });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: "No active cooking session found"
      });
    }

    // Update interaction
    interaction.status = 'completed';
    interaction.completedAt = new Date();
    interaction.isVerifiedCook = true;
    
    if (cookingTime) {
      interaction.totalCookingTime = cookingTime;
    } else if (interaction.startedAt) {
      // Calculate cooking time
      const timeDiff = new Date().getTime() - interaction.startedAt.getTime();
      interaction.totalCookingTime = Math.round(timeDiff / (1000 * 60)); // in minutes
    }

    interaction.actions.push({
      type: 'marked_complete',
      timestamp: new Date(),
      metadata: {
        rating,
        notes,
        cookingTime: interaction.totalCookingTime
      }
    });

    await interaction.save();

    // Update meal plan if this was from meal plan
    if (interaction.fromMealPlan && interaction.mealPlanId) {
      await updateMealPlanStatus(interaction.mealPlanId, recipeId, 'completed');
    }

    return res.status(200).json({
      success: true,
      message: "Cooking completed successfully",
      data: {
        sessionId: interaction.sessionId,
        status: interaction.status,
        totalCookingTime: interaction.totalCookingTime,
        isVerifiedCook: interaction.isVerifiedCook,
        completedAt: interaction.completedAt
      }
    });

  } catch (error) {
    console.error("Error completing cooking:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete cooking",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Didn't cook / Abandon cooking
export const didntCook = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { recipeId, sessionId, reason } = req.body;

    if (!recipeId) {
      return res.status(400).json({
        success: false,
        message: "Recipe ID is required"
      });
    }

    // Find the cooking session
    const interaction = await RecipeInteraction.findOne({
      userId,
      recipeId,
      sessionId: sessionId || { $exists: true },
      status: { $in: ['started_cooking', 'cooking_in_progress'] }
    }).sort({ createdAt: -1 });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: "No active cooking session found"
      });
    }

    // Update interaction
    interaction.status = 'didnt_cook';
    interaction.actions.push({
      type: 'marked_didnt_cook',
      timestamp: new Date(),
      metadata: {
        reason
      }
    });

    await interaction.save();

    // Update meal plan if this was from meal plan
    if (interaction.fromMealPlan && interaction.mealPlanId) {
      await updateMealPlanStatus(interaction.mealPlanId, recipeId, 'didnt_cook');
    }

    return res.status(200).json({
      success: true,
      message: "Marked as didn't cook",
      data: {
        sessionId: interaction.sessionId,
        status: interaction.status
      }
    });

  } catch (error) {
    console.error("Error marking didn't cook:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark as didn't cook",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get cooking status for a recipe
export const getCookingStatus = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { recipeId } = req.params;

    const interaction = await RecipeInteraction.findOne({
      userId,
      recipeId
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        hasCookingHistory: !!interaction,
        currentStatus: interaction?.status || 'not_started',
        isVerifiedCook: interaction?.isVerifiedCook || false,
        sessionId: interaction?.sessionId || null,
        startedAt: interaction?.startedAt || null,
        completedAt: interaction?.completedAt || null,
        totalCookingTime: interaction?.totalCookingTime || 0
      }
    });

  } catch (error) {
    console.error("Error getting cooking status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get cooking status",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Helper function to update meal plan status
async function updateMealPlanStatus(mealPlanId: string, recipeId: string, status: string) {
  try {
    // This would depend on your meal plan schema structure
    // You might need to update specific day/meal entries
    await MealPlan.findByIdAndUpdate(mealPlanId, {
      $addToSet: {
        completedRecipes: {
          recipeId,
          status,
          completedAt: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error updating meal plan status:', error);
  }
}

// Track step completion (optional - for detailed tracking)
export const trackStepCompletion = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { recipeId, stepNumber, sessionId } = req.body;

    const interaction = await RecipeInteraction.findOne({
      userId,
      recipeId,
      sessionId,
      status: { $in: ['started_cooking', 'cooking_in_progress'] }
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: "No active cooking session found"
      });
    }

    interaction.status = 'cooking_in_progress';
    interaction.actions.push({
      type: 'completed_step',
      stepNumber,
      timestamp: new Date()
    });

    await interaction.save();

    return res.status(200).json({
      success: true,
      message: "Step completion tracked"
    });

  } catch (error) {
    console.error("Error tracking step completion:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to track step completion"
    });
  }
};