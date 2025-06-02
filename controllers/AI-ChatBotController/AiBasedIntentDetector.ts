import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

export class AIIntentDetector {
  private static model: ChatGoogleGenerativeAI;
  
  public static initialize(aiModel: ChatGoogleGenerativeAI) {
    this.model = aiModel;
  }
  
  // Add this method to generate structured content like recipes
  public static async generateStructuredContent(prompt: string, schema: any): Promise<any> {
    try {
      if (!this.model) {
        throw new Error("AI model not initialized. Call initialize() first.");
      }
      
      // Create a structured output parser based on the provided schema
      const outputParser = StructuredOutputParser.fromNamesAndDescriptions(schema);
      
      // Create a prompt template that includes formatting instructions
      const promptTemplate = PromptTemplate.fromTemplate(`
        ${prompt}
        
        Respond with a structured JSON object following this format:
        {format_instructions}
        
        Make sure to follow the exact format requested.
      `);
      
      // Create a processing chain: prompt -> AI model -> output parser
      const chain = RunnableSequence.from([
        promptTemplate,
        this.model,
        outputParser
      ]);
      
      // Process the chain with the format instructions
      const response = await chain.invoke({
        format_instructions: outputParser.getFormatInstructions()
      });
      
      return response;
    } catch (error) {
      console.error('Error generating structured content:', error);
      throw error;
    }
  }
  
  public static async detectIntent(message: string): Promise<RecipeIntent> {
    try {
      // Define the expected output structure
      const outputParser = StructuredOutputParser.fromNamesAndDescriptions({
        category: "The primary intent category",
        isUserSpecific: "Boolean indicating if query is about user's own recipes",
        recipeName: "The name of a specific recipe if mentioned, otherwise null",
        recipeNumber: "The number of the recipe if specified by number, otherwise null",
        searchQuery: "The search term if this is a search request, otherwise null",
        confidence: "Confidence score from 0.0 to 1.0",
        // Add these new fields for user profile queries
        userProfileField: "The specific user profile field being asked about (name, email, bio, etc.), or null",
        isGreeting: "Boolean indicating if this is a greeting that should include user's name",
        // New meal plan fields
        targetWeek: "The date mentioned for the meal plan (null if none specified)",
        dietaryPreferences: "Array of dietary preferences mentioned (vegan, low-carb, etc.)",
        mealPlanName: "A name for the meal plan if specified"
      });
      
      const prompt = PromptTemplate.fromTemplate(`
        You are an intent classifier for a recipe app chatbot. Analyze the user's message and categorize their intent.
        
        User message: {message}
        
        Possible intent categories:
        - showUserRecipes: User wants to see their own recipe collection
        - recentRecipes: User wants to see their most recently created recipes
        - recipeStats: User wants statistics about their recipe collection
        - searchRecipes: User wants to search for specific recipes 
        - publicRecipes: User wants to see public/trending recipes
        - specificRecipe: User is asking about one specific recipe
        - cookingInstructions: User wants cooking instructions for a dish
        - createRecipe: User wants to create a new recipe
        - favoriteRecipes: User wants to see their favorite recipes
        - addToFavorites: User wants to add a recipe to favorites
        - removeFromFavorites: User wants to remove a recipe from favorites
        - userProfile: User is asking about their profile or account information
        - greeting: User is saying hello or starting a conversation
        - createMealPlan: User wants to create a meal plan for a specific week
        - viewMealPlan: User wants to view their existing meal plans
        
        When analyzing createMealPlan intents, also extract:
        - targetWeek: The date mentioned for the meal plan (null if none specified)
        - dietaryPreferences: Array of dietary preferences mentioned (vegan, low-carb, etc.)
        - mealPlanName: A name for the meal plan if specified
        
        {format_instructions}
      `);
      
      // Create a processing chain
      const chain = RunnableSequence.from([
        prompt,
        this.model,
        outputParser
      ]);
      
      // Process the user message
      const response = await chain.invoke({
        message: message,
        format_instructions: outputParser.getFormatInstructions()
      });
      
      return response as any;
      
    } catch (error) {
      console.error('Error in AI intent detection:', error);
      
      // Fallback to basic intent detection
      return {
        category: message.toLowerCase().includes('my') ? 'showUserRecipes' : 'unknown',
        isUserSpecific: message.toLowerCase().includes('my'),
        recipeName: null,
        recipeNumber: null,
        searchQuery: null,
        confidence: 0.5
      };
    }
  }
}

export interface RecipeIntent {
  category: string;
  isUserSpecific: boolean;
  recipeName: string | null;
  recipeNumber: number | null;
  searchQuery: string | null;
  confidence: number;
  userProfileField?: string | null;
  isGreeting?: boolean;
  // New meal plan fields
  targetWeek?: string | null;
  mealPlanName?: string | null;
  notes?: string | null;
}