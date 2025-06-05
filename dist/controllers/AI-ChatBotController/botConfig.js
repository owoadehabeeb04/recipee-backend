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
const AiBasedIntentDetector_1 = require("./AiBasedIntentDetector");
const initChatbot = () => {
    const TheAiModel = new google_genai_1.ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY || "",
        model: "gemini-2.0-flash-exp",
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        streaming: true,
        // streamingChunkSize: 1
    });
    const chatPrompt = prompts_1.ChatPromptTemplate.fromMessages([
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
        new prompts_1.MessagesPlaceholder("history"),
        ["human", "{input}"]
    ]);
    AiBasedIntentDetector_1.AIIntentDetector.initialize(TheAiModel);
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
