"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testIntentDetection = exports.saveMessageFeedback = exports.sendMessage = void 0;
const botConfig_1 = require("./botConfig");
const helpers_1 = require("./helpers");
const aiChatMessage_1 = require("../../models/aiChatMessage");
const intentDetectionSystem_1 = require("../../services/intentDetectionSystem");
const sendMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { chatId } = req.params;
        const { message } = req.body;
        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Message content is required"
            });
        }
        const chat = await aiChatMessage_1.Chat.findOne({ _id: chatId, user: userId });
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });
        }
        const messageCount = await aiChatMessage_1.Message.countDocuments({ chat: chatId });
        if (messageCount >= 38) {
            return res.status(400).json({
                success: false,
                message: "This chat has reached the 40-message limit. Please start a new chat to continue.",
                limitReached: true
            });
        }
        const isApproachingLimit = messageCount >= 28;
        const remainingPairs = Math.floor((40 - messageCount - 2) / 2);
        const previousMessages = await aiChatMessage_1.Message.find({ chat: chatId })
            .sort({ createdAt: 1 });
        // Format history for the LLM
        const history = previousMessages.map(msg => [msg.role === 'user' ? 'human' : 'ai', msg.content]);
        // Save user message
        const userMessage = new aiChatMessage_1.Message({
            chat: chatId,
            content: message,
            role: 'user'
        });
        await userMessage.save();
        // Check if this is the first message or if chat has default title - update title
        if (messageCount === 0 || chat.title === 'New conversation' || chat.title === 'New culinary conversation') {
            // Generate chat title based on first message
            const newTitle = generateChatTitle(message);
            console.log({ newTitle });
            // Update chat title directly in database
            await aiChatMessage_1.Chat.findByIdAndUpdate(chatId, { title: newTitle });
            console.log(`Updated chat ${chatId} title to: "${newTitle}"`);
        }
        // Detect user intent
        try {
            const intentResult = intentDetectionSystem_1.IntentDetector.detectIntent(message);
            console.log('Detected intent:', intentResult);
            const userContext = {
                userId: req.user._id,
                username: req.user.username,
                preferences: req.user.preferences || {}
            };
            let aiResponse;
            // Route based on intent
            switch (intentResult.mode) {
                // case 'database':
                //   aiResponse = await MessageHandler.handleDatabaseQuery(intentResult, userContext, message);
                //   break;
                // case 'smart_request':
                //   aiResponse = await MessageHandler.handleSmartRequest(intentResult, userContext, message);
                //   break;
                case 'general_cooking':
                default:
                    // Use existing chatbot chain for general cooking advice
                    aiResponse = await botConfig_1.chatbotChain.invoke({
                        input: message,
                        history: history,
                        chatId: chatId,
                        user: userContext
                    });
                    break;
            }
            // If approaching limit, append a warning to the AI response
            let finalResponse = aiResponse;
            if (isApproachingLimit) {
                finalResponse = `${aiResponse}\n\n---\n*Note: This chat will reach its 40-message limit after ${remainingPairs} more exchanges. Please consider starting a new chat soon.*`;
            }
            // Save AI response
            const assistantMessage = new aiChatMessage_1.Message({
                chat: chatId,
                content: finalResponse,
                role: 'assistant'
            });
            await assistantMessage.save();
            // Handle meal planning detection if needed
            if (helpers_1.helpers.isMealPlanningRequest(message) &&
                helpers_1.helpers.detectDateReference(message) &&
                helpers_1.helpers.detectNutritionalGoal(message)) {
                // Future meal planning code here
            }
            // Standard response (no change needed for frontend)
            return res.status(200).json({
                success: true,
                message: "AI response generated successfully",
                data: {
                    userMessage: userMessage,
                    aiMessage: assistantMessage
                },
                chatInfo: {
                    messageCount: messageCount + 2,
                    totalLimit: 40,
                    isApproachingLimit,
                    remainingPairs
                }
            });
        }
        catch (error) {
            console.error("Error generating AI response:", error);
            // Save error message
            const errorMessage = new aiChatMessage_1.Message({
                chat: chatId,
                content: "I'm sorry, I encountered an error while processing your request. Please try again.",
                role: 'assistant'
            });
            await errorMessage.save();
            return res.status(500).json({
                success: false,
                message: "Failed to generate AI response",
                error: error instanceof Error ? error.message : "Unknown error",
                data: {
                    userMessage: userMessage,
                    aiMessage: errorMessage
                }
            });
        }
    }
    catch (error) {
        console.error("Error sending message:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send message",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.sendMessage = sendMessage;
/**
 * Save message feedback (thumbs up/down)
 */
const saveMessageFeedback = async (req, res) => {
    try {
        const userId = req.user._id;
        const { messageId } = req.params;
        const { feedback } = req.body;
        if (!['positive', 'negative'].includes(feedback)) {
            return res.status(400).json({
                success: false,
                message: "Invalid feedback value"
            });
        }
        // Find the message and verify it belongs to user's chat
        const message = await aiChatMessage_1.Message.findById(messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }
        // Verify ownership
        const chat = await aiChatMessage_1.Chat.findOne({ _id: message.chat, user: userId });
        if (!chat) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to provide feedback on this message"
            });
        }
        // Update feedback
        message.feedback = feedback;
        await message.save();
        return res.status(200).json({
            success: true,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};
exports.saveMessageFeedback = saveMessageFeedback;
// Add this new test endpoint at the end of the file
const testIntentDetection = async (req, res) => {
    try {
        let { message } = req.body;
        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message is required for testing"
            });
        }
        // Handle different message formats
        let messageString;
        if (typeof message === 'string') {
            messageString = message;
        }
        else if (typeof message === 'object' && message.text) {
            messageString = message.text;
        }
        else if (typeof message === 'object' && message.content) {
            messageString = message.content;
        }
        else {
            messageString = String(message);
        }
        console.log('Testing message:', messageString);
        console.log('Original message type:', typeof message);
        const intentResult = intentDetectionSystem_1.IntentDetector.detectIntent(messageString);
        // Add debug info
        console.log('Intent detection result:', intentResult);
        console.log('Message analysis:', {
            original: messageString,
            lowercase: messageString.toLowerCase(),
            containsShow: messageString.toLowerCase().includes('show'),
            containsMe: messageString.toLowerCase().includes('me'),
            containsMy: messageString.toLowerCase().includes('my'),
            containsRecipes: messageString.toLowerCase().includes('recipes')
        });
        return res.status(200).json({
            success: true,
            message: "Intent detected successfully",
            data: {
                originalMessage: messageString,
                detectedIntent: intentResult,
                explanation: `Detected as: ${intentResult.mode} with confidence: ${intentResult.confidence}`,
                debug: {
                    containsShow: messageString.toLowerCase().includes('show'),
                    containsMe: messageString.toLowerCase().includes('me'),
                    containsMy: messageString.toLowerCase().includes('my'),
                    containsRecipes: messageString.toLowerCase().includes('recipes')
                }
            }
        });
    }
    catch (error) {
        console.error("Error testing intent:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to test intent detection",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.testIntentDetection = testIntentDetection;
/**
 * Generate a meaningful chat title based on message content
 */
function generateChatTitle(message) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    // Clean up the message
    const content = message.toLowerCase();
    // Recipe detection
    if (content.includes('recipe') || content.includes('how to make')) {
        // Extract recipe name
        let recipeName = '';
        if (content.includes('recipe for')) {
            recipeName = (_b = (_a = content.split('recipe for')[1]) === null || _a === void 0 ? void 0 : _a.split(/[?.!]|$/)[0]) === null || _b === void 0 ? void 0 : _b.trim();
        }
        else if (content.includes('how to make')) {
            recipeName = (_d = (_c = content.split('how to make')[1]) === null || _c === void 0 ? void 0 : _c.split(/[?.!]|$/)[0]) === null || _d === void 0 ? void 0 : _d.trim();
        }
        if (recipeName && recipeName.length > 2) {
            return recipeName.charAt(0).toUpperCase() +
                recipeName.slice(1, 25) +
                (recipeName.length > 25 ? '...' : '') +
                ' recipe';
        }
    }
    // Meal planning
    if (content.includes('meal plan')) {
        return 'Meal planning discussion';
    }
    // Browse recipes
    if (content.includes('show me recipes') || content.includes('my recipes')) {
        return 'Recipe collection';
    }
    // Cooking techniques
    if (content.includes('how do i cook') || content.includes('how to cook')) {
        const technique = ((_f = (_e = content.split('how do i cook')[1]) === null || _e === void 0 ? void 0 : _e.split(/[?.!]|$/)[0]) === null || _f === void 0 ? void 0 : _f.trim()) ||
            ((_h = (_g = content.split('how to cook')[1]) === null || _g === void 0 ? void 0 : _g.split(/[?.!]|$/)[0]) === null || _h === void 0 ? void 0 : _h.trim());
        if (technique) {
            return 'Cooking ' + technique.trim();
        }
    }
    // Clean up for general title
    let cleanContent = content
        .replace(/[?.,!]/g, '')
        .replace(/(\b(can|you|me|i|please|hello|hey|hi)\b)/gi, '')
        .trim();
    if (cleanContent.length > 5) {
        return cleanContent.charAt(0).toUpperCase() +
            cleanContent.slice(1, 25) +
            (cleanContent.length > 25 ? '...' : '');
    }
    return 'Culinary conversation';
}
