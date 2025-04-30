"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveMessageFeedback = exports.sendMessage = void 0;
const botConfig_1 = require("./botConfig");
const helpers_1 = require("./helpers");
const chatController_1 = require("./chatController");
const aiChatMessage_1 = require("../../models/aiChatMessage");
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
        // Get previous messages for context
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
        // Update chat with latest message and time
        chat.lastMessage = message.substring(0, 50) + (message.length > 50 ? '...' : '');
        chat.updatedAt = new Date();
        // Check if this is the first message and generate a title
        const isFirstMessage = messageCount === 0;
        if (isFirstMessage && chat.title === 'New Culinary Conversation') {
            // Generate title asynchronously
            (0, chatController_1.generateChatTitle)(chatId, message).catch(err => {
                console.error("Error in background title generation:", err);
            });
            // Set temporary title
            chat.title = `Chat about ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`;
        }
        await chat.save();
        try {
            // IMPORTANT: Fix for AsyncGenerator error - don't pass full request object
            // Instead, extract only the necessary user data
            const userContext = {
                userId: req.user._id,
                username: req.user.username,
                preferences: req.user.preferences || {}
            };
            // Process the query through our chatbot chain
            const aiResponse = await botConfig_1.chatbotChain.invoke({
                input: message,
                history: history,
                chatId: chatId,
                user: userContext // Pass just the user data, not the full request
            });
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
            message: "Feedback saved successfully",
            data: message
        });
    }
    catch (error) {
        console.error("Error saving message feedback:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to save feedback",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.saveMessageFeedback = saveMessageFeedback;
