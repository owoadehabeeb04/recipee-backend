import RecipeModel from "../../models/recipe";
import axios from 'axios';

class MessageHandler {
  public static async handleDatabaseQuery(intent: any, userContext: any, message: string): Promise<string> {
    const { action, entity } = intent;
    const userId = userContext.userId;

    try {
      switch (entity) {
        case 'recipes':
          return await this.handleRecipeQueries(action, userId, message);
          
        case 'favorites':
          return await this.handleFavoriteQueries(action, userId, message);
          
        default:
          return `I can help you with your ${entity}, but I need more specific information. What would you like to know?`;
      }
    } catch (error) {
      console.error('Database query error:', error);
      return "I'm having trouble accessing your data right now. Please try again in a moment.";
    }
  }

  private static async handleRecipeQueries(action: string, userId: string, message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();
    
    // Different types of recipe queries
    if (lowerMessage.includes('recent') || lowerMessage.includes('latest')) {
      return await this.getRecentRecipes(userId);
    }
    
    if (lowerMessage.includes('stats') || lowerMessage.includes('statistics')) {
      return await this.getRecipeStats(userId);
    }
    
    if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
      return await this.searchUserRecipes(userId, message);
    }
    
    // Default: show all user recipes
    return await this.getAllUserRecipes(userId);
  }

  private static async getAllUserRecipes(userId: string): Promise<string> {
    try {
      const recipes = await RecipeModel.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(15)
        .select('title cuisine difficulty cookingTime createdAt');
        
      if (recipes.length === 0) {
        return "You don't have any saved recipes yet! 🍳\n\nWould you like me to help you create your first recipe? Just tell me what you'd like to cook!";
      }
      
      const recipeList = recipes.map((recipe, index) => {
        const time = recipe.cookingTime ? `⏱️ ${recipe.cookingTime}` : '';
        const difficulty = recipe.difficulty ? `📊 ${recipe.difficulty}` : '';
        
        return `${index + 1}. **${recipe.title}** \n   ${time} ${difficulty}`;
      }).join('\n\n');
      
      return `Here are your saved recipes (${recipes.length} total):\n\n${recipeList}\n\n💡 *Want details for any recipe? Just ask "show me recipe [number]" or "tell me about [recipe name]"*`;
      
    } catch (error) {
      console.error('Error fetching user recipes:', error);
      return "Sorry, I couldn't fetch your recipes right now. Please try again.";
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

  private static async getRecipeStats(userId: string): Promise<string> {
    try {
      const totalRecipes = await RecipeModel.countDocuments({ user: userId });
      
      if (totalRecipes === 0) {
        return "You haven't created any recipes yet! Time to start your culinary journey! 🚀";
      }
      
      // Get cuisine breakdown
      const cuisineStats = await RecipeModel.aggregate([
        { $match: { user: userId } },
        { $group: { _id: "$cuisine", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      // Get difficulty breakdown
      const difficultyStats = await RecipeModel.aggregate([
        { $match: { user: userId } },
        { $group: { _id: "$difficulty", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      let statsText = `📊 **Your Recipe Statistics:**\n\n`;
      statsText += `📚 Total Recipes: **${totalRecipes}**\n\n`;
      
      if (cuisineStats.length > 0) {
        statsText += `🌍 **Top Cuisines:**\n`;
        cuisineStats.forEach((stat, index) => {
          statsText += `${index + 1}. ${stat._id || 'General'}: ${stat.count} recipes\n`;
        });
        statsText += '\n';
      }
      
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

  private static async handleFavoriteQueries(action: string, userId: string, message: string): Promise<string> {
    try {
      // Note: Adjust this based on how you handle favorites in your schema
      // This assumes you have a favorites collection or a field in recipes
      
      const favorites = await RecipeModel.find({ 
        user: userId,
        // Add your favorite logic here - might be a separate Favorite model
        // or a boolean field like isFavorite: true
      }).limit(10);
      
      return this.formatFavoritesResponse(favorites);
      
    } catch (error) {
      console.error('Error fetching favorites:', error);
      return "Sorry, I couldn't fetch your favorite recipes right now.";
    }
  }

  private static formatFavoritesResponse(favorites: any[]): string {
    if (favorites.length === 0) {
      return "You haven't marked any recipes as favorites yet! ⭐\n\nWhen you find recipes you love, make sure to favorite them so I can suggest them again! 💖";
    }
    
    const favoriteList = favorites.map((recipe, index) => 
      `${index + 1}. **${recipe.title}** ⭐ (${recipe.cuisine || 'General'})`
    ).join('\n');
    
    return `Your favorite recipes:\n\n${favoriteList}\n\nWhich favorite would you like to cook today? 🍽️`;
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
}

export { MessageHandler };