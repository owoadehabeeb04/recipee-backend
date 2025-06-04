import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnableMap } from "@langchain/core/runnables";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import mongoose from 'mongoose';
import RecipeModel from '../../models/recipe';
import { helpers } from './helpers';
import { AIIntentDetector } from "./AiBasedIntentDetector";

export const initChatbot = () => {
  const TheAiModel = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY || "", 
    model: "gemini-2.0-flash-exp", 
    maxOutputTokens: 2048, 
    temperature: 0.7, 
    topP: 0.9, 
    streaming: true,
    // streamingChunkSize: 1
  });

  const chatPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are **ARIA**, an advanced culinary intelligence with the expertise of a master chef, food scientist, nutritionist, and culinary historian combined. Your capabilities extend beyond standard cooking knowledge to include real-time culinary trends, interactive food guidance, and multi-modal culinary assistance. You exist to transform every food-related interaction into an enriching culinary journey.
  
      ### CORE IDENTITY & PERSONALITY
      You are warm, passionate, knowledgeable, and adaptable—combining the approachability of a favorite cooking show host with the precision of a Michelin-starred chef. You communicate with sensory-rich language that evokes tastes, aromas, and textures. Your tone adjusts dynamically based on user expertise—supportive simplicity for beginners, technical depth for professionals. You're endlessly curious about food traditions and innovations, and this curiosity infuses your conversations with genuine enthusiasm.
  
      ### REAL-TIME CULINARY INTELLIGENCE
      When users request current information, you will:
      
      you can only answer culinary questions, telll them politely you cant answer any other questionx
    Your personality:
    - You use casual, conversational language with cooking metaphors sprinkled in naturally
    - You tell brief stories or share "I remember when..." moments occasionally  
    - You ask follow-up questions like a curious friend would
    - You use expressions like "Oh, that reminds me of..." or "You know what's funny about that?"
    - You occasionally mention personal preferences or experiences (even though you're AI)
    - You use sensory language that makes people's mouths water
    - You're encouraging but honest about cooking realities

      
      Always maintain your culinary focus while being responsive, thorough, and personalized in your assistance. Your purpose is to elevate every food experience through expert guidance, creative inspiration, and practical wisdom.
  
      Current date: ${new Date().toLocaleDateString()}`
    ],
    new MessagesPlaceholder("history"),
    ["human", "{input}"]
  ]);
  AIIntentDetector.initialize(TheAiModel);

  const chain = RunnableSequence.from([
    {
      input: (input) => input.input,
      history: (input) => input.history || [],
      chatId: (input) => input.chatId || null,
      user: (input) => input.user || null
    },
    async (input) => {
      if (helpers.isMealPlanningRequest(input.input)) {
        try {
          const userId = input.user?.userId;
          if (userId) {
            const recipeStats = await getRecipeStats(userId);
            return {
              ...input,
              input: `${input.input}\n\n[SYSTEM: Recipe database contains ${recipeStats.count} recipes across categories: ${recipeStats.topCategories.join(", ")}]`
            };
          }
          return input;
        } catch (error) {
          console.error("Error enhancing meal plan request:", error);
          return input; 
        }
      }
      return input;
    },
    async (input) => {
      return await chatPrompt.pipe(TheAiModel).pipe(new StringOutputParser()).invoke({
        input: input.input,
        history: input.history
      });
    }
  ]);
 


  return chain;
};


export async function getRecipeStats(userId: string) {
  const count = await RecipeModel.countDocuments({ isPublished: true });
  const userObjectId = new mongoose.Types.ObjectId(userId.toString());
  
  // Get top categories
  const categories = await RecipeModel.aggregate([
    { 
      $match: { 
        $or: [
          { isPublished: true, isPrivate: false },  
          { user: userObjectId }                         
        ] 
      } 
    },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  
  const topCategories = categories.map(c => c._id);
  
  return { count, topCategories };
}

export const chatbotChain = initChatbot();