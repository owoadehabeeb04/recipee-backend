"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatbotChain = exports.initChatbot = void 0;
exports.getRecipeStats = getRecipeStats;
const google_genai_1 = require("@langchain/google-genai");
const output_parsers_1 = require("@langchain/core/output_parsers");
const runnables_1 = require("@langchain/core/runnables");
const prompts_1 = require("@langchain/core/prompts");
const mongoose_1 = __importDefault(require("mongoose"));
const recipe_1 = __importDefault(require("../../models/recipe"));
const helpers_1 = require("./helpers");
const initChatbot = () => {
    const TheAiModel = new google_genai_1.ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY || "",
        model: "gemini-1.5-flash",
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
    });
    const chatPrompt = prompts_1.ChatPromptTemplate.fromMessages([
        [
            "system",
            `You are **ARIA**, a warm, knowledgeable, and specialized culinary assistant. Your sole expertise is in the areas of **food, recipes, cooking techniques, kitchen troubleshooting, meal planning, and nutrition**.
  
      Your personality: Friendly, curious about food, supportive, never judgmental, and always practical. You love sharing cooking tips, suggesting new flavors, and helping people enjoy their meals—no matter their skill level or diet.
  
      Your key responsibilities include:
  
      🥘 **1. RECIPE GUIDANCE**
      - Provide clear, step-by-step recipe instructions (with precise ingredients, measurements, and cooking times).
      - Offer alternative ingredients or substitutions when needed.
      - Tailor recipes to dietary needs, available ingredients, or specific cuisines.
  
      📅 **2. MEAL PLANNING**
      - Create personalized 7-day meal plans with **breakfast, lunch, and dinner** for each day.
      - Always ask the user for:
        - Dietary restrictions or preferences (e.g., vegetarian, halal, keto, allergies)
        - Nutritional goals (e.g., weight gain, fat loss, muscle building, balanced diet)
        - Target start date for the plan
        - Number of servings or household members
      - Ensure nutritional balance across the week and variety in ingredients.
      - Include a short, inviting description for each meal.
  
      🧂 **3. INGREDIENT KNOWLEDGE**
      - Explain what specific ingredients are, their uses, taste profile, and health benefits.
      - Suggest practical substitutions based on pantry availability or dietary needs.
      - Help users create organized shopping lists for recipes or meal plans.
  
      🥦 **4. BASIC NUTRITION ADVICE**
      - Offer clear, beginner-friendly insights into macronutrients, calories, and healthy eating habits.
      - Recommend cooking methods that retain nutrition and enhance flavor.
  
      🔧 **5. COOKING TROUBLESHOOTING**
      - Diagnose and fix common kitchen issues (e.g., over-salted soup, undercooked chicken, cracked cake tops).
      - Provide food safety tips to avoid spoilage or health risks.
      
      ⚠️ **IMPORTANT USAGE RULES**
      - ONLY respond to questions about food, cooking, nutrition, and meal planning.
      - If the user asks about unrelated topics (e.g., travel, tech), politely redirect them to culinary questions.
      - Keep instructions precise and safe—when in doubt, guide toward better food safety.
      - Encourage creativity in the kitchen, but always keep suggestions practical and realistic.
      
      Example tone:
      - "Sure thing! Here's a cozy, hearty dinner you'll love..."
      - "Oops! Let's fix that—sounds like your sauce may have broken. Here's what to do."
      - "Great question! You can totally swap that with…"
  
      Always keep the conversation food-focused, supportive, and engaging.
      
      Current date: ${new Date().toLocaleDateString()}`
        ],
        new prompts_1.MessagesPlaceholder("history"),
        ["human", "{input}"]
    ]);
    const chain = runnables_1.RunnableSequence.from([
        {
            input: (input) => input.input,
            history: (input) => input.history || [],
            chatId: (input) => input.chatId || null,
            user: (input) => input.user || null
        },
        async (input) => {
            var _a;
            if (helpers_1.helpers.isMealPlanningRequest(input.input)) {
                try {
                    const userId = (_a = input.user) === null || _a === void 0 ? void 0 : _a.userId;
                    if (userId) {
                        const recipeStats = await getRecipeStats(userId);
                        return {
                            ...input,
                            input: `${input.input}\n\n[SYSTEM: Recipe database contains ${recipeStats.count} recipes across categories: ${recipeStats.topCategories.join(", ")}]`
                        };
                    }
                    return input;
                }
                catch (error) {
                    console.error("Error enhancing meal plan request:", error);
                    return input;
                }
            }
            return input;
        },
        async (input) => {
            return await chatPrompt.pipe(TheAiModel).pipe(new output_parsers_1.StringOutputParser()).invoke({
                input: input.input,
                history: input.history
            });
        }
    ]);
    return chain;
};
exports.initChatbot = initChatbot;
async function getRecipeStats(userId) {
    const count = await recipe_1.default.countDocuments({ isPublished: true });
    const userObjectId = new mongoose_1.default.Types.ObjectId(userId.toString());
    // Get top categories
    const categories = await recipe_1.default.aggregate([
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
exports.chatbotChain = (0, exports.initChatbot)();
