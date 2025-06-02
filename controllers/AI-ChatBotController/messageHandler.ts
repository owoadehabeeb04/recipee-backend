import RecipeModel from "../../models/recipe";
import FavoriteModel from "../../models/favoriteRecipe";
import UserModel from "../../models/user";
import axios from 'axios';
import { AIIntentDetector } from "./AiBasedIntentDetector";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import MealPlan from "../../models/meal-planner";

class MessageHandler {
  public static async handleDatabaseQuery(intent: any, userContext: any, message: string): Promise<string> {
    try {
      // Use AI to determine intent instead of hardcoded rules
      const aiIntent = await AIIntentDetector.detectIntent(message);
      const userId = userContext.userId;
      
      console.log('AI detected intent:', aiIntent); // For debugging
      
      // If confidence is too low, fall back to clarification
      if (aiIntent.confidence < 0.6) {
        return `I'm not completely sure what you're looking for. Please try more specific wording.`;
      }
      
      // Handle intent based on AI classification
      switch(aiIntent.category) {
        case 'showUserRecipes':
          return await this.getAllUserRecipes(userId);
          
        case 'recentRecipes':
          return await this.getRecentRecipes(userId);
          
        case 'recipeStats':
          return await this.getRecipeStats(userId);
          
        case 'searchRecipes':
          // If we have a specific search query identified by AI
          if (aiIntent.searchQuery) {
            // Use the AI-extracted search term instead of parsing it ourselves
            return await this.searchUserRecipes(userId, aiIntent.searchQuery);
          } else {
            return await this.searchUserRecipes(userId, message);
          }
          
          case 'createMealPlan':
            return await this.handleMealPlanCreation(userId, aiIntent, message);
            
          case 'viewMealPlan':
            return await this.handleViewMealPlan(userId, message);
            
        case 'publicRecipes':
          return await this.getPublicRecipes();
          
        case 'specificRecipe':
          // If the AI detected a recipe number
          if (aiIntent.recipeNumber) {
            return await this.getRecipeByNumber(userId, aiIntent.recipeNumber);
          }
          // If the AI detected a recipe name
          else if (aiIntent.recipeName) {
            // If user-specific, check their collection first
            if (aiIntent.isUserSpecific) {
              return await this.getRecipeByName(userId, aiIntent.recipeName);
            } else {
              return await this.checkAndHandleRecipeQuery(userId, aiIntent.recipeName);
            }
          }
          break;
          
        case 'cookingInstructions':
          if (aiIntent.recipeName) {
            return await this.checkAndHandleRecipeQuery(userId, aiIntent.recipeName);
          }
          break;
          
        case 'createRecipe':
          if (aiIntent.recipeName) {
            return this.startRecipeCreationProcess(userId, aiIntent.recipeName);
          } else {
            return "What kind of recipe would you like to create?";
          }

        case 'userProfile':
          return await this.handleUserProfileQuery(userId, message, aiIntent.userProfileField);

        case 'greeting':
          return await this.createPersonalizedGreeting(userId, aiIntent.isGreeting || false);
          
        default:
          // Fall back to traditional handling if AI gives unexpected result
          return this.fallbackHandling(message, userId);
      }
      
      // If we get here, something went wrong with intent handling
      return this.fallbackHandling(message, userId);
      
    } catch (error) {
      console.error('Database query error:', error);
      return "I'm having trouble accessing your data right now. Please try again in a moment.";
    }
  }

  private static async fallbackHandling(message: string, userId: string): Promise<string> {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('my') && lowerMessage.includes('recipe')) {
      return await this.getAllUserRecipes(userId);
    }
    
    return `I'm not sure what recipe information you're looking for. You can ask me to:\n\n- Show your recipes\n- Show your recent recipes\n- Get recipe statistics\n- Search for specific recipes\n- Show public recipes\n- Get cooking instructions for a dish`;
  }

  private static startRecipeCreationProcess(userId: string, recipeName: string): string {
    return `Let's create a new recipe for ${recipeName}! Please provide the following details:\n\n` +
      `1. Main ingredients\n` +
      `2. Cooking time (in minutes)\n` +
      `3. Difficulty level (easy, medium, hard)\n` +
      `4. Number of servings\n\n` +
      `You can provide this information all at once or one by one.`;
  }

  private static async checkAndHandleRecipeQuery(userId: string, message: string): Promise<string> {
    try {
      // Extract recipe name from the message
      let recipeName = message.toLowerCase();
      
      // Remove common phrases
      const phrasesToRemove = [
        'how to make', 'show me', 'tell me about', 'details for',
        'recipe for', 'how do i cook', 'how do i make', 'show recipe for'
      ];
      
      phrasesToRemove.forEach(phrase => {
        recipeName = recipeName.replace(phrase, '');
      });
      
      recipeName = recipeName.trim();
      
      if (!recipeName) {
        return "What recipe would you like to know about? Please specify a dish name.";
      }
      
      // First check if they have this recipe in their own collection
      const userRecipes = await RecipeModel.find({
        user: userId,
        title: { $regex: recipeName, $options: 'i' }
      }).sort({ createdAt: -1 }).limit(3);
      
      // Then check for published recipes in the entire system
      const publicRecipes = await RecipeModel.find({
        isPublished: true, // Only get published recipes
        title: { $regex: recipeName, $options: 'i' }
      }).sort({ averageRating: -1 }).limit(3); // Sort by highest rating
      
      // Determine what options to show
      const hasUserRecipes = userRecipes.length > 0;
      const hasPublicRecipes = publicRecipes.length > 0;
      
      if (hasUserRecipes && hasPublicRecipes) {
        // They have both personal and public matches
        const userList = userRecipes.map((recipe, index) => 
          `${index + 1}. ${recipe.title} (Your recipe)`
        ).join('\n');
        
        const publicList = publicRecipes.map((recipe, index) => 
          `${index + 1}. ${recipe.title} (⭐ ${recipe.averageRating.toFixed(1)}) - by ${recipe.userDetails?.name || recipe.adminDetails?.name || 'Unknown'}`
        ).join('\n');
        
        return `I found recipes for "${recipeName}" in both your collection and our public database:\n\n**Your Recipes:**\n${userList}\n\n**Public Recipes:**\n${publicList}\n\nWhich would you like to see? You can say:\n- "Show my recipe #1"\n- "Show public recipe #2"\n- "General instructions please"`;
      } 
      else if (hasUserRecipes) {
        // They only have personal matches
        const userList = userRecipes.map((recipe, index) => 
          `${index + 1}. ${recipe.title}`
        ).join('\n');
        
        return `I found these matching recipes in your collection:\n\n${userList}\n\nWould you like to see one of these, or get general cooking instructions for "${recipeName}"?\n\nYou can say:\n- "Show my recipe #1"\n- "General instructions please"`;
      }
      else if (hasPublicRecipes) {
        // Only public matches available
        const publicList = publicRecipes.map((recipe, index) => 
          `${index + 1}. ${recipe.title} (⭐ ${recipe.averageRating.toFixed(1)}) - by ${recipe.userDetails?.name || recipe.adminDetails?.name || 'Unknown'}`
        ).join('\n');
        
        return `I found these "${recipeName}" recipes in our public collection:\n\n${publicList}\n\nWould you like to see one of these, or get general cooking instructions?\n\nYou can say:\n- "Show recipe #1"\n- "General instructions please"`;
      }
      else {
        // No matching recipes anywhere in the system
        return `I couldn't find any recipes for "${recipeName}" in our database. Would you like:\n\n1. General cooking instructions for ${recipeName}\n2. Help creating a new ${recipeName} recipe for your collection`;
      }
      
    } catch (error) {
      console.error('Error checking recipe query:', error);
      return "Sorry, I had trouble processing your recipe request.";
    }
  }

  private static async getRecipeByNumber(userId: string, recipeNumber: number): Promise<string> {
    try {
      // First get the most recent recipes to get the one with the matching number
      const recipes: any = await RecipeModel.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(15);
      
      if (recipes.length === 0) {
        return "You don't have any recipes in your collection yet.";
      }
      
      // Adjust for 0-based array vs. 1-based user numbering
      const index = recipeNumber - 1;
      
      if (index < 0 || index >= recipes.length) {
        return `I couldn't find recipe #${recipeNumber}. Please choose a number between 1 and ${recipes.length}.`;
      }
      
      // Get the full details of the recipe
      return await this.getRecipeDetails(recipes[index]._id);
      
    } catch (error) {
      console.error('Error fetching recipe by number:', error);
      return "Sorry, I had trouble finding that recipe.";
    }
  }

  private static async getRecipeByName(userId: string, message: string): Promise<string> {
    try {
      // Extract recipe name from the message
      let recipeName = message.toLowerCase();
      
      // Remove common phrases
      const phrasesToRemove = [
        'how to make', 'show me', 'tell me about', 'details for',
        'recipe for', 'how do i cook', 'how do i make', 'show recipe for'
      ];
      
      phrasesToRemove.forEach(phrase => {
        recipeName = recipeName.replace(phrase, '');
      });
      
      recipeName = recipeName.trim();
      
      if (!recipeName) {
        return "Which recipe would you like to know about? Please specify a recipe name.";
      }
      
      // Find recipes that match the name
      const matchingRecipes: any = await RecipeModel.find({
        user: userId,
        title: { $regex: recipeName, $options: 'i' }
      }).sort({ createdAt: -1 }).limit(5);
      
      if (matchingRecipes.length === 0) {
        return `I couldn't find any recipe matching "${recipeName}" in your collection. Would you like me to help you create a new recipe?`;
      }
      
      if (matchingRecipes.length === 1) {
        // If only one result, show full details
        return await this.getRecipeDetails(matchingRecipes[0]._id);
      } else {
        // If multiple results, show a list to choose from
        const recipeList = matchingRecipes.map((recipe: any, index: any) => 
          `${index + 1}. **${recipe.title}** (${recipe.difficulty || 'Medium'}, ${recipe.cookingTime || '?'} mins)`
        ).join('\n');
        
        return `I found multiple recipes matching "${recipeName}":\n\n${recipeList}\n\nWhich one would you like to see? Reply with "show recipe #" followed by the number.`;
      }
      
    } catch (error) {
      console.error('Error fetching recipe by name:', error);
      return "Sorry, I had trouble finding that recipe.";
    }
  }

  private static async getAllUserRecipes(userId: string): Promise<string> {
    try {
      const recipes = await RecipeModel.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(15);
          
      if (recipes.length === 0) {
        return "You don't have any saved recipes yet! 🍳\n\nWould you like me to help you create your first recipe? Just tell me what you'd like to cook!";
      }
      
      const recipeList = this.formatRecipeList(recipes);
      
      return `Here are your saved recipes (${recipes.length} total):\n\n${recipeList}\n\n💡 *Want details for any recipe? Just ask "show me recipe [number]" or "tell me about [recipe name]"*`;
      
    } catch (error) {
      console.error('Error fetching user recipes:', error);
      return "Sorry, I couldn't fetch your recipes right now. Please try again.";
    }
  }
  
  private static async getPublicRecipes(): Promise<string> {
    try {
      const publicRecipes = await RecipeModel.find({
        isPublished: true  // Using isPublished instead of public based on your schema
      })
      .sort({ createdAt: -1 })
      .limit(10);
      
      if (publicRecipes.length === 0) {
        return "I couldn't find any public recipes at the moment. Would you like to see recipes from your personal collection instead?";
      }
      
      const recipeList = this.formatRecipeList(publicRecipes);
      
      return `Here are some recipes from our public collection:\n\n${recipeList}\n\n*Want to see your own recipes instead? Just ask for "my recipes"!*`;
    } catch (error) {
      console.error('Error fetching public recipes:', error);
      return "Sorry, I couldn't fetch public recipes right now. Would you like to see your personal recipes instead?";
    }
  }
  
  // Add a method to get detailed recipe info
  private static async getRecipeDetails(recipeId: string): Promise<string> {
    try {
      const recipe = await RecipeModel.findById(recipeId);
      
      if (!recipe) {
        return "Sorry, I couldn't find that recipe.";
      }
      
      // Format ingredients
      const ingredientsList = recipe.ingredients.map(ing => 
        `• ${ing.quantity} ${ing.unit} ${ing.name}`
      ).join('\n');
      
      // Format steps
      const stepsList = recipe.steps.map((step, i) => 
        `${i+1}. ${step}`
      ).join('\n\n');
      
      // Format nutrition
      const nutrition = `
      • Calories: ${recipe.nutrition.calories}
      • Protein: ${recipe.nutrition.protein}g
      • Carbs: ${recipe.nutrition.carbs}g
      • Fat: ${recipe.nutrition.fat}g
      • Fiber: ${recipe.nutrition.fiber}g
      • Sugar: ${recipe.nutrition.sugar}g
      `;
      
      // Format tips if they exist
      const tips = recipe.tips && recipe.tips.length > 0 
        ? `\n\n**Cooking Tips:**\n${recipe.tips.map(tip => `• ${tip}`).join('\n')}`
        : '';
      
      // Format ratings
      let ratingInfo = "";
      if (recipe.averageRating > 0) {
        ratingInfo = `\n\n**Rating:** ⭐ ${recipe.averageRating.toFixed(1)}/5.0 (${recipe.totalReviews} ${recipe.totalReviews === 1 ? 'review' : 'reviews'})`;
        
        if (recipe.ratingDistribution) {
          ratingInfo += `\n**Rating Breakdown:**
          • 5 stars: ${recipe.ratingDistribution['5']} ratings
          • 4 stars: ${recipe.ratingDistribution['4']} ratings
          • 3 stars: ${recipe.ratingDistribution['3']} ratings
          • 2 stars: ${recipe.ratingDistribution['2']} ratings
          • 1 star: ${recipe.ratingDistribution['1']} ratings`;
        }
      }
      
      // Combine everything
      return `# ${recipe.title} 
      
  **Category:** ${recipe.category}  |  **Difficulty:** ${recipe.difficulty}  |  **Time:** ${recipe.cookingTime} mins  |  **Servings:** ${recipe.servings}
      
  ${recipe.description}
  
  **Ingredients:**
  ${ingredientsList}
  
  **Instructions:**
  ${stepsList}
  
  **Nutrition Information:**
  ${nutrition}
  ${tips}
  ${ratingInfo}
  
  *Created by ${recipe.userDetails?.name || recipe.adminDetails?.name || 'Unknown'}*
  `;
      
    } catch (error) {
      console.error('Error fetching recipe details:', error);
      return "Sorry, I couldn't fetch the recipe details right now.";
    }
  }

  private static async getRecentRecipes(userId: string): Promise<string> {
    try {
      const recentRecipes = await RecipeModel.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title cuisine createdAt');
        
      if (recentRecipes.length === 0) {
        return "You haven't created any recipes recently. Ready to add a new one? 👨‍🍳";
      }
      
      const recipeList = recentRecipes.map((recipe, index) => {
        const timeAgo = this.formatTimeAgo(recipe.createdAt);
        return `${index + 1}. **${recipe.title}** - ${timeAgo}`;
      }).join('\n');
      
      return `Your most recent recipes:\n\n${recipeList}\n\nWhich one would you like to cook again? 🍽️`;
      
    } catch (error) {
      console.error('Error fetching recent recipes:', error);
      return "Sorry, I couldn't fetch your recent recipes right now.";
    }
  }

  private static formatRecipeList(recipes: any[]): string {
    if (recipes.length === 0) {
      return "No recipes found!";
    }
    
    const recipeList = recipes.map((recipe, index) => {
      // Basic info
      const title = recipe.title;
      const category = recipe.category ? `🍲 ${recipe.category.charAt(0).toUpperCase() + recipe.category.slice(1)}` : '';
      const time = recipe.cookingTime ? `⏱️ ${recipe.cookingTime} mins` : '';
      const difficulty = recipe.difficulty ? `📊 ${recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}` : '';
      
      // Ratings
      const rating = recipe.averageRating 
        ? `⭐ ${recipe.averageRating.toFixed(1)}/5.0 (${recipe.totalReviews} ${recipe.totalReviews === 1 ? 'review' : 'reviews'})`
        : '';
      
      // Creator info
      const creator = recipe.userDetails?.name || recipe.adminDetails?.name || 'Unknown';
      
      // Description preview (truncated)
      const descriptionPreview = recipe.description
        ? `${recipe.description.substring(0, 60)}${recipe.description.length > 60 ? '...' : ''}`
        : '';
      
      // Put it all together
      return `${index + 1}. **${title}**\n   ${category} | ${time} | ${difficulty}\n   ${rating}\n   By: ${creator}\n   ${descriptionPreview}`;
    }).join('\n\n');
    
    return recipeList;
  }

  private static async getRecipeStats(userId: string): Promise<string> {
    try {
      const totalRecipes = await RecipeModel.countDocuments({ user: userId });
      
      if (totalRecipes === 0) {
        return "You haven't created any recipes yet! Time to start your culinary journey! 🚀";
      }
      
      
      // Get difficulty breakdown
      const difficultyStats = await RecipeModel.aggregate([
        { $match: { user: userId } },
        { $group: { _id: "$difficulty", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      let statsText = `📊 **Your Recipe Statistics:**\n\n`;
      statsText += `📚 Total Recipes: **${totalRecipes}**\n\n`;
   
      
      if (difficultyStats.length > 0) {
        statsText += `⭐ **Difficulty Levels:**\n`;
        difficultyStats.forEach((stat) => {
          statsText += `${stat._id || 'Not specified'}: ${stat.count} recipes\n`;
        });
      }
      
      return statsText + "\n🎯 Keep cooking and expanding your recipe collection!";
      
    } catch (error) {
      console.error('Error fetching recipe stats:', error);
      return "Sorry, I couldn't fetch your recipe statistics right now.";
    }
  }

  private static async searchUserRecipes(userId: string, message: string): Promise<string> {
    // Extract search term from message
    const searchTerms = ['find', 'search', 'look for', 'show me'];
    let searchQuery = message.toLowerCase();
    
    searchTerms.forEach(term => {
      searchQuery = searchQuery.replace(term, '').trim();
    });
    
    // Remove common words
    searchQuery = searchQuery.replace(/recipe|recipes|my|the|a|an/g, '').trim();
    
    if (!searchQuery) {
      return "What type of recipe are you looking for? Tell me the cuisine, ingredient, or dish name! 🔍";
    }
    
    try {
      const recipes = await RecipeModel.find({
        user: userId,
        $or: [
          { title: { $regex: searchQuery, $options: 'i' } },
          { cuisine: { $regex: searchQuery, $options: 'i' } },
          { ingredients: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } }
        ]
      }).limit(10);
      
      if (recipes.length === 0) {
        return `I couldn't find any recipes matching "${searchQuery}" in your collection. 😔\n\nWant me to help you create a new ${searchQuery} recipe?`;
      }
      
      const resultList = recipes.map((recipe, index) => {
        return `${index + 1}. **${recipe.title}**  || 'General'})`;
      }).join('\n');
      
      return `Found ${recipes.length} recipe(s) matching "${searchQuery}":\n\n${resultList}\n\nWhich one interests you? 👨‍🍳`;
      
    } catch (error) {
      console.error('Error searching recipes:', error);
      return "Sorry, I had trouble searching your recipes. Please try again.";
    }
  }

  private static async addToFavorites(userId: string, recipeId: string): Promise<string> {
    try {
      // First check if recipe exists
      const recipe = await RecipeModel.findById(recipeId);
      if (!recipe) {
        return "Sorry, I couldn't find that recipe.";
      }
      
      // Check if it's already a favorite using the Favorite model
      const existingFavorite = await FavoriteModel.findOne({
        user: userId,
        recipe: recipeId
      });
      
      if (existingFavorite) {
        return `"${recipe.title}" is already in your favorites!`;
      }
      
      // Create a new favorite entry
      await FavoriteModel.create({
        user: userId,
        recipe: recipeId
      });
      
      return `✅ Added "${recipe.title}" to your favorites!`;
    } catch (error: any) {
      console.error('Error adding to favorites:', error);
      
      // Check if it's a duplicate error (user tried to favorite same recipe twice)
      if (error.code === 11000) {
        return "This recipe is already in your favorites!";
      }
      
      return "Sorry, I couldn't add this recipe to your favorites right now.";
    }
  }

  private static async removeFromFavorites(userId: string, recipeId: string): Promise<string> {
    try {
      // First check if recipe exists
      const recipe = await RecipeModel.findById(recipeId);
      if (!recipe) {
        return "Sorry, I couldn't find that recipe.";
      }
      
      // Check if it's actually a favorite
      const existingFavorite = await FavoriteModel.findOne({
        user: userId,
        recipe: recipeId
      });
      
      if (!existingFavorite) {
        return `"${recipe.title}" isn't in your favorites.`;
      }
      
      // Remove the favorite entry
      await FavoriteModel.deleteOne({
        user: userId,
        recipe: recipeId
      });
      
      return `✅ Removed "${recipe.title}" from your favorites.`;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return "Sorry, I couldn't remove this recipe from your favorites right now.";
    }
  }

  private static async handleFavoriteQueries(action: string, userId: string, message: string): Promise<string> {
    try {
      // Add to favorites intent
      if (action === 'add' || 
          message.toLowerCase().includes('add to favorites') || 
          message.toLowerCase().includes('favorite this') ||
          message.toLowerCase().includes('save this')) {
          
        // Check if there's a recipe number mentioned
        const recipeMatch = message.match(/recipe\s+(\d+)|recipe\s+number\s+(\d+)|#(\d+)/i);
        if (recipeMatch) {
          const recipeNumber = parseInt(recipeMatch[1] || recipeMatch[2] || recipeMatch[3]);
          // Get recipe ID from number
          const recipes: any = await RecipeModel.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(15);
          
          if (recipeNumber > 0 && recipeNumber <= recipes.length) {
            return await this.addToFavorites(userId, recipes[recipeNumber-1]._id);
          }
        }
        
        return "Which recipe would you like to add to favorites? Please specify by number or name.";
      }
      
      // Remove from favorites intent
      if (action === 'remove' ||
          message.toLowerCase().includes('remove from favorites') || 
          message.toLowerCase().includes('unfavorite') ||
          message.toLowerCase().includes('delete favorite')) {
        
        const recipeMatch = message.match(/recipe\s+(\d+)|recipe\s+number\s+(\d+)|#(\d+)/i);
        if (recipeMatch) {
          const recipeNumber = parseInt(recipeMatch[1] || recipeMatch[2] || recipeMatch[3]);
          
          // First get all favorites
          const favorites = await this.getUserFavorites(userId);
          
          if (recipeNumber > 0 && recipeNumber <= favorites.length) {
            return await this.removeFromFavorites(userId, favorites[recipeNumber-1]._id);
          }
        }
        
        return "Which recipe would you like to remove from favorites? Please specify by number.";
      }
      
      // Get all favorites (default action)
      return await this.getAllFavorites(userId);
    } catch (error) {
      console.error('Error handling favorite query:', error);
      return "Sorry, I couldn't process your favorites request right now.";
    }
  }

  private static async getAllFavorites(userId: string): Promise<string> {
    try {
      // Get favorites with populated recipe data
      const favorites = await FavoriteModel.find({ user: userId })
        .populate('recipe')
        .sort({ createdAt: -1 })
        .limit(10);
      
      return this.formatFavoritesResponse(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      return "Sorry, I couldn't fetch your favorite recipes right now.";
    }
  }

  private static async getUserFavorites(userId: string): Promise<any[]> {
    try {
      const favorites = await FavoriteModel.find({ user: userId })
        .populate('recipe')
        .sort({ createdAt: -1 });
      
      return favorites;
    } catch (error) {
      console.error('Error fetching user favorites:', error);
      return [];
    }
  }

  private static formatFavoritesResponse(favorites: any[]): string {
    if (favorites.length === 0) {
      return "You haven't marked any recipes as favorites yet! ⭐\n\nWhen you find recipes you love, make sure to favorite them so I can suggest them again! 💖";
    }
    
    const favoriteList = favorites.map((favorite, index) => {
      const recipe = favorite.recipe;
      const rating = recipe.averageRating 
        ? `⭐ ${recipe.averageRating.toFixed(1)}/5.0`
        : '';
      
      const addedOn = this.formatTimeAgo(favorite.createdAt);
      
      return `${index + 1}. **${recipe.title}** ${rating}\n   Added to favorites: ${addedOn}`;
    }).join('\n\n');
    
    return `Your favorite recipes:\n\n${favoriteList}\n\nWhich favorite would you like to cook today? 🍽️\nYou can say "show me favorite #1" or "remove favorite #2"`;
  }

  private static formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  // Placeholder for smart requests
  public static async handleSmartRequest(intent: any, userContext: any, message: string): Promise<string> {
    return `I can help you ${intent.action} a ${intent.entity}! I'll need some information first. (Smart request handling coming next...)`;
  }

  public static async generateRecipe(userId: string, recipeName: string): Promise<string> {
    try {
      // Use AI to generate recipe
      const prompt = `
        Generate a detailed recipe for ${recipeName}. Include:
        - A brief description (2-3 sentences)
        - List of ingredients with quantities
        - Step-by-step cooking instructions
        - Approximate cooking time
        - Difficulty level
        - Number of servings
        - Nutrition information (calories, protein, carbs, fat)
        - 2-3 cooking tips
        
        Format the response in structured data that can be parsed.
      `;
      
      // Get recipe from AI
      const aiRecipe = await this.getAIGeneratedRecipe(prompt);
      
      // Format a preview for the user
      const preview = `
# ${aiRecipe.title || recipeName}

**Description:**
${aiRecipe.description}

**Estimated Cooking Time:** ${aiRecipe.cookingTime} minutes
**Difficulty:** ${aiRecipe.difficulty}
**Servings:** ${aiRecipe.servings}

**Ingredients Preview:**
${aiRecipe.ingredients.slice(0, 3).map((ing: any) => `• ${ing}`).join('\n')}
${aiRecipe.ingredients.length > 3 ? `• ...and ${aiRecipe.ingredients.length - 3} more ingredients` : ''}

**Instructions Preview:**
${aiRecipe.steps.slice(0, 2).map((step: any, i: number) => `${i+1}. ${step}`).join('\n')}
${aiRecipe.steps.length > 2 ? `...and ${aiRecipe.steps.length - 2} more steps` : ''}

Would you like me to:
1. Save this recipe to your collection
2. Modify any part of the recipe
3. Generate a completely different recipe
`;
      
      // Store the generated recipe in temporary session storage
      // (this would need to be implemented separately)
      
      return preview;
      
    } catch (error) {
      console.error('Error generating recipe:', error);
      return "Sorry, I had trouble creating a recipe. Please try again or provide more details.";
    }
  }

  private static async getAIGeneratedRecipe(prompt: string): Promise<any> {
    try {
      // Use the AI model to generate the recipe
      const result = await AIIntentDetector.generateStructuredContent(prompt, {
        title: "The recipe title",
        description: "A short description of the dish",
        ingredients: "Array of ingredient strings with quantities",
        steps: "Array of cooking instruction steps",
        cookingTime: "Total time in minutes",
        difficulty: "Easy, Medium, or Hard",
        servings: "Number of servings",
        nutrition: {
          calories: "Total calories per serving",
          protein: "Protein in grams",
          carbs: "Carbs in grams",
          fat: "Fat in grams"
        },
        tips: "Array of cooking tips"
      });
      
      return result;
      
    } catch (error) {
      console.error('Error in AI recipe generation:', error);
      // Fallback with basic structure
      return {
        title: prompt.split('for ')[1]?.split('.')[0] || "New Recipe",
        description: "A delicious homemade dish.",
        ingredients: ["Ingredient 1", "Ingredient 2", "Ingredient 3"],
        steps: ["Prepare ingredients", "Cook according to instructions", "Serve and enjoy"],
        cookingTime: 30,
        difficulty: "Medium",
        servings: 4,
        nutrition: {
          calories: 300,
          protein: 15,
          carbs: 40,
          fat: 10
        },
        tips: ["For best results, follow all steps carefully"]
      };
    }
  }

  // New method to handle user profile queries
  private static async handleUserProfileQuery(userId: string, message: string, profileField: string | null | undefined): Promise<string> {
    try {
      // Get user details
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return "I'm having trouble finding your account information.";
      }
      
      // If a specific field was requested
      if (profileField) {
        switch(profileField.toLowerCase()) {
          case 'name':
          case 'username':
            return `Your username is ${user.username}.`;
            
          case 'email':
            return `Your email address is ${user.email}.`;
            
          case 'bio':
            return user.bio 
              ? `Your bio: "${user.bio}"`
              : "You haven't added a bio to your profile yet. Would you like to add one?";
            
          case 'location':
            return user.location
              ? `Your location is set to ${user.location}.`
              : "You haven't added your location to your profile yet.";
              
          case 'website':
            return user.website
              ? `Your website is ${user.website}.`
              : "You haven't added a website to your profile yet.";
              
          case 'phone':
          case 'phone number':
            return user.phoneNumber
              ? `Your phone number is ${user.phoneNumber}.`
              : "You haven't added a phone number to your profile yet.";
              
          default:
            // General profile information
            return this.formatUserProfile(user);
        }
      } else {
        // If no specific field, show general profile info
        return this.formatUserProfile(user);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return "Sorry, I couldn't access your profile information right now.";
    }
  }
  
  // Format user profile information
  private static formatUserProfile(user: any): string {
    let profileInfo = `**Your Profile Information**\n\n`;
    profileInfo += `Username: ${user.username}\n`;
    profileInfo += `Email: ${user.email}\n`;
    
    if (user.bio) profileInfo += `Bio: ${user.bio}\n`;
    if (user.location) profileInfo += `Location: ${user.location}\n`;
    if (user.website) profileInfo += `Website: ${user.website}\n`;
    if (user.phoneNumber) profileInfo += `Phone: ${user.phoneNumber}\n`;
    
    profileInfo += `\nAccount created: ${this.formatTimeAgo(user.createdAt)}`;
    
    return profileInfo;
  }
  
  // Create personalized greeting
  private static async createPersonalizedGreeting(userId: string, includeUserName: boolean): Promise<string> {
    try {
      if (includeUserName) {
        const user = await UserModel.findById(userId);
        if (user) {
          const timeOfDay = this.getTimeOfDay();
          return `${timeOfDay}, ${user.username}! How can I help with your recipes today?`;
        }
      }
      
      // Default greeting if we can't get the username
      return "Hello! How can I help with your recipes today?";
    } catch (error) {
      console.error('Error creating personalized greeting:', error);
      return "Hello! How can I help you today?";
    }
  }
  
  
  // Helper method to get time of day greeting
  private static getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

 
  private static async createAIGeneratedMealSlot(mealType: string, dietaryPreferences: string[]): Promise<any> {
    // Get AI to generate recipe suggestions for this meal slot
    const prompt = `Generate a ${dietaryPreferences.join(' ')} ${mealType} recipe idea.`;
    
    try {
      const aiRecipe = await this.getAIGeneratedRecipe(prompt);
      
      // Create a new recipe in the database
      const newRecipe = new RecipeModel({
        title: aiRecipe.title,
        description: aiRecipe.description,
        ingredients: aiRecipe.ingredients.map((ing: string) => {
          const parts = ing.split(' ');
          return {
            quantity: parts[0] || "1",
            unit: parts[1] || "unit",
            name: parts.slice(2).join(' ') || ing
          };
        }),
        steps: aiRecipe.steps,
        cookingTime: aiRecipe.cookingTime,
        difficulty: aiRecipe.difficulty,
        servings: aiRecipe.servings,
        nutrition: aiRecipe.nutrition || {},
        tips: aiRecipe.tips || [],
        isAIGenerated: true,
        isPublished: false
      });
      
      const savedRecipe = await newRecipe.save();
      
      // Return in format expected by meal plan schema
      return {
        mealType: mealType,
        recipe: savedRecipe._id,
        recipeDetails: {
          title: savedRecipe.title,
          featuredImage: savedRecipe.featuredImage || "",
          category: savedRecipe.category || mealType,
          cookingTime: savedRecipe.cookingTime || 30,
          difficulty: savedRecipe.difficulty || "Medium",
          servings: savedRecipe.servings || 2,
          steps: savedRecipe.steps || [],
          tips: savedRecipe.tips || [],
          nutrition: {
            calories: savedRecipe.nutrition?.calories || 0,
            protein: savedRecipe.nutrition?.protein || 0,
            carbs: savedRecipe.nutrition?.carbs || 0,
            fat: savedRecipe.nutrition?.fat || 0
          }
        }
      };
    } catch (error) {
      console.error('Error generating AI recipe for meal plan:', error);
      
      // Fallback to a placeholder meal
      return {
        mealType: mealType,
        recipeDetails: {
          title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Meal`,
          category: mealType,
          cookingTime: 30,
          difficulty: "Medium",
          servings: 2,
          steps: ["Prepare ingredients", "Cook according to recipe"],
          tips: ["Plan ahead for best results"],
          nutrition: {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
          }
        }
      };
    }
  }
  private static async handleViewMealPlan(userId: string, message: string): Promise<string> {
    try {
      // Find user's meal plans
      const mealPlans = await MealPlan.find({ user: userId })
        .sort({ week: -1 })
        .limit(5);
      
      if (mealPlans.length === 0) {
        return "You don't have any meal plans yet. Would you like me to create one for you?";
      }
      
      // Format the list of meal plans
      const planList = mealPlans.map((plan, index) => {
        const weekStart = new Date(plan.week);
        const formattedDate = weekStart.toISOString().split('T')[0]; // YYYY-MM-DD format
        const url = `/dashboard/meal-plan/${formattedDate}`;
        
        return `${index + 1}. **${plan.name}** - [View Plan](${url})`;
      }).join('\n');
      
      return `Here are your most recent meal plans:\n\n${planList}\n\nWould you like me to create a new meal plan for you?`;
      
    } catch (error) {
      console.error('Error fetching meal plans:', error);
      return "Sorry, I couldn't fetch your meal plans right now. Please try again later.";
    }
  }

  // private static async generateMealPlan(userId: string, targetWeek: Date, dietaryPreferences: string[]): Promise<any> {
  //   // Get user's recipes
  //   const userRecipes = await RecipeModel.find({ user: userId })
  //     .sort({ createdAt: -1 })
  //     .limit(100);
    
  //   // Get public recipes as additional options
  //   const publicRecipes = await RecipeModel.find({ 
  //     isPublished: true,
  //     ...(dietaryPreferences.length > 0 && {
  //       $or: dietaryPreferences.map(pref => ({
  //         tags: { $regex: pref, $options: 'i' }
  //       }))
  //     })
  //   }).limit(100);
    
  //   // Combine recipes but prioritize user's own
  //   const availableRecipes = [...userRecipes, ...publicRecipes];
    
  //   // Check if we have enough recipes
  //   if (availableRecipes.length < 5) {
  //     throw new Error("Not enough recipes available to create a balanced meal plan");
  //   }
    
  //   // This will be our plan structure following the schema
  //   const plan = {
  //     monday: {
  //       breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
  //       lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
  //       dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
  //     },
  //     tuesday: {
  //       breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
  //       lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
  //       dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
  //     },
  //     wednesday: {
  //       breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
  //       lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
  //       dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
  //     },
  //     thursday: {
  //       breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
  //       lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
  //       dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
  //     },
  //     friday: {
  //       breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
  //       lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
  //       dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
  //     },
  //     saturday: {
  //       breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
  //       lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
  //       dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
  //     },
  //     sunday: {
  //       breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
  //       lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
  //       dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
  //     }
  //   };
    
  //   return plan;
  // }

 
  private static async generateMealPlan(userId: string, targetWeek: Date, dietaryPreferences: string[]): Promise<any> {
    // Get user's recipes
    const userRecipes = await RecipeModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(100);
    
    // Get public recipes as additional options
    const publicRecipes = await RecipeModel.find({ 
      isPublished: true,
      ...(dietaryPreferences.length > 0 && {
        $or: dietaryPreferences.map(pref => ({
          tags: { $regex: pref, $options: 'i' }
        }))
      })
    }).limit(100);
    
    // Combine recipes but prioritize user's own
    const availableRecipes = [...userRecipes, ...publicRecipes];
    
    // Check if we have enough recipes
    if (availableRecipes.length < 5) {
      throw new Error("Not enough recipes available to create a balanced meal plan");
    }
    
    // This will be our plan structure following the schema
    const plan = {
      monday: {
        breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
        lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
        dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
      },
      tuesday: {
        breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
        lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
        dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
      },
      wednesday: {
        breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
        lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
        dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
      },
      thursday: {
        breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
        lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
        dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
      },
      friday: {
        breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
        lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
        dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
      },
      saturday: {
        breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
        lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
        dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
      },
      sunday: {
        breakfast: await this.assignMealToSlot('breakfast', availableRecipes, dietaryPreferences),
        lunch: await this.assignMealToSlot('lunch', availableRecipes, dietaryPreferences),
        dinner: await this.assignMealToSlot('dinner', availableRecipes, dietaryPreferences)
      }
    };
    
    return plan;
  }
  
  private static async assignMealToSlot(
    mealType: string, 
    availableRecipes: any[], 
    dietaryPreferences: string[]
  ): Promise<any> {
    // Create a pool of recipes appropriate for this meal type
    let recipePool = [...availableRecipes]; // Clone the array
    
    // Try to find recipes suitable for this meal type first
    if (mealType === 'breakfast') {
      // Filter for breakfast-appropriate recipes
      const breakfastRecipes = recipePool.filter(r => 
        r.title?.toLowerCase().includes('breakfast') || 
        r.category?.toLowerCase() === 'breakfast' ||
        ['egg', 'toast', 'oatmeal', 'cereal', 'pancake', 'muffin', 'yogurt'].some(term => 
          r.title?.toLowerCase().includes(term)
        )
      );
      
      // If we have breakfast recipes, prioritize them
      if (breakfastRecipes.length > 0) {
        recipePool = breakfastRecipes;
      }
    } else if (mealType === 'lunch') {
      // Filter for lunch-appropriate recipes
      const lunchRecipes = recipePool.filter(r => 
        r.title?.toLowerCase().includes('lunch') || 
        r.category?.toLowerCase() === 'lunch' ||
        ['salad', 'sandwich', 'soup', 'wrap', 'bowl'].some(term => 
          r.title?.toLowerCase().includes(term)
        )
      );
      
      // If we have lunch recipes, prioritize them
      if (lunchRecipes.length > 0) {
        recipePool = lunchRecipes;
      }
    } else if (mealType === 'dinner') {
      // Filter for dinner-appropriate recipes
      const dinnerRecipes = recipePool.filter(r => 
        r.title?.toLowerCase().includes('dinner') || 
        r.category?.toLowerCase() === 'dinner' ||
        ['pasta', 'chicken', 'beef', 'fish', 'steak', 'curry', 'roast'].some(term => 
          r.title?.toLowerCase().includes(term)
        )
      );
      
      // If we have dinner recipes, prioritize them
      if (dinnerRecipes.length > 0) {
        recipePool = dinnerRecipes;
      }
    }
    
    // Apply dietary preferences if any
    if (dietaryPreferences.length > 0) {
      const filteredForDiet = recipePool.filter(r => 
        dietaryPreferences.some(pref => 
          r.tags?.includes(pref) || 
          r.title?.toLowerCase().includes(pref) || 
          r.description?.toLowerCase().includes(pref)
        )
      );
      
      // Only use diet-filtered recipes if we found any
      if (filteredForDiet.length > 0) {
        recipePool = filteredForDiet;
      }
    }
    
    // If we still have more than one recipe, pick one randomly
    let selectedRecipe;
    if (recipePool.length > 0) {
      selectedRecipe = recipePool[Math.floor(Math.random() * recipePool.length)];
    } else {
      // If no suitable recipes, take any random recipe
      selectedRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
    }
    
    // Return in the format expected by the schema
    return {
      mealType: mealType,
      recipe: selectedRecipe._id,
      recipeDetails: {
        title: selectedRecipe.title,
        featuredImage: selectedRecipe.featuredImage || "",
        category: selectedRecipe.category || "",
        cookingTime: selectedRecipe.cookingTime || 30,
        difficulty: selectedRecipe.difficulty || "Medium",
        servings: selectedRecipe.servings || 2,
        steps: selectedRecipe.steps || [],
        tips: selectedRecipe.tips || [],
        nutrition: {
          calories: selectedRecipe.nutrition?.calories || 0,
          protein: selectedRecipe.nutrition?.protein || 0,
          carbs: selectedRecipe.nutrition?.carbs || 0,
          fat: selectedRecipe.nutrition?.fat || 0
        }
      }
    };
  }
  private static async handleMealPlanCreation(userId: string, aiIntent: any, message: string): Promise<string> {
    try {
      // Get target week from intent or default to current week
      let targetWeek = new Date();
      if (aiIntent.targetWeek) {
        targetWeek = new Date(aiIntent.targetWeek);
      } else {
        // Default to next week's Monday if no date specified
        targetWeek.setDate(targetWeek.getDate() + (8 - targetWeek.getDay()) % 7);
      }
      
      // Get dietary preferences
      const dietaryPreferences = aiIntent.dietaryPreferences || [];
      
      // Check if user has enough recipes
      const recipeCount = await RecipeModel.countDocuments({ user: userId });
      const publicRecipeCount = await RecipeModel.countDocuments({ isPublished: true });
      
      if (recipeCount + publicRecipeCount < 5) {
        return "You need more recipes to create a meal plan. You currently have " + 
          recipeCount + " recipes. Please add more recipes first or browse the public recipes.";
      }
      
      // Create a name for the meal plan
      const planName = aiIntent.mealPlanName || `Meal Plan for ${targetWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      
      // Generate the meal plan
      const mealPlanData = await this.generateMealPlan(userId, targetWeek, dietaryPreferences);
      
      // Create meal plan in database
      const newMealPlan = new MealPlan({
        name: planName,
        week: targetWeek,
        plan: mealPlanData,
        user: userId,
        isActive: true,
        notes: `Created via chatbot on ${new Date().toLocaleDateString()}`
      });
      
      await newMealPlan.save();
      
      // Format the URL for the meal plan
      const formattedDate = targetWeek.toISOString().split('T')[0]; // YYYY-MM-DD format
      const mealPlanUrl = `/dashboard/meal-plan/${formattedDate}`;
      
      // Return success message with link
      return `✅ I've created your meal plan "${planName}"!\n\n` +
        `This plan includes ${dietaryPreferences.length > 0 ? dietaryPreferences.join(', ') + ' ' : ''}meals for the week of ${targetWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.\n\n` +
        `You can view and customize your meal plan here:\n[View Your Meal Plan](${mealPlanUrl})\n\n` +
        `Would you like me to explain what's on the menu?`;
      
    } catch (error: any) {
      console.error('Error creating meal plan:', error);
      
      if (error.message === "Not enough recipes available to create a balanced meal plan") {
        return "You don't have enough recipes to create a diverse meal plan. Try adding more recipes to your collection first, or browse the public recipes section.";
      }
      
      return "Sorry, I couldn't create your meal plan right now. Please try again later.";
    }
  }
}

class NLUHelper {
  // Intent categories with proper type definition
  private static intentPatterns: { [key: string]: string[] } = {
    showUserRecipes: [
      'my recipes', 'show my recipes', 'list my recipes', 'what recipes do i have', 
      'display my recipes', 'see my recipes', 'view my recipes', 'all my recipes',
      'what are my recipes', 'recipes i have', 'recipes i\'ve made'
    ],
    
    recentRecipes: [
      'recent', 'latest', 'new', 'newest', 'just made', 'recently added',
      'recently created', 'last added', 'last created', 'what i made recently'
    ],
    
    recipeStats: [
      'stats', 'statistics', 'summary', 'overview', 'metrics', 'analytics',
      'numbers', 'count', 'totals', 'breakdown', 'how many recipes'
    ],
    
    searchRecipes: [
      'search', 'find', 'look for', 'search for', 'where is', 'do i have',
      'locate', 'seeking', 'hunting for', 'trying to find'
    ],
    
    publicRecipes: [
      'public', 'popular', 'trending', 'featured', 'community', 'others',
      'everyone', 'published', 'shared', 'global', 'top rated'
    ],
    
    cooking: [
      'how to make', 'how to cook', 'how to prepare', 'instructions for',
      'steps to make', 'recipe for making', 'directions for', 'guide to making'
    ]
  };

  // Checks input against all patterns in a category
  public static matchesIntent(input: string, intentCategory: string): boolean {
    const patterns = this.intentPatterns[intentCategory];
    if (!patterns) return false;
    
    input = input.toLowerCase();
    return patterns.some((pattern: string) => input.includes(pattern));
  }
  
  // Determines user ownership intent
  public static isUserSpecific(input: string): boolean {
    const userPatterns = ['my', 'mine', 'i made', 'i created', 'i have', 
                         'i\'ve made', 'i cooked', 'i saved', 'i wrote'];
    input = input.toLowerCase();
    return userPatterns.some(pattern => input.includes(pattern));
  }
  
  // Calculates confidence score for intent matching
  public static getIntentWithConfidence(input: string): {intent: string, confidence: number} {
    input = input.toLowerCase();
    let bestMatch = {intent: 'unknown', confidence: 0};
    
    // Check each intent category with proper type handling
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      // Count how many patterns match
      const matches = patterns.filter((pattern: string) => input.includes(pattern));
      const confidence = matches.length > 0 ? matches.length / patterns.length : 0;
      
      // If this intent has higher confidence, it becomes our best match
      if (confidence > bestMatch.confidence) {
        bestMatch = {intent, confidence};
      }
    }
    
    // Add user-specific modifier if applicable
    if (this.isUserSpecific(input) && !['showUserRecipes', 'recentRecipes'].includes(bestMatch.intent)) {
      bestMatch.intent = 'user_' + bestMatch.intent;
    }
    
    return bestMatch;
  }

}

export { MessageHandler, NLUHelper };