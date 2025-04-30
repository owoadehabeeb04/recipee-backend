"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.continueChat = exports.renameChat = exports.deleteChat = exports.getChatMessages = exports.getChats = exports.generateChatTitle = exports.createChat = void 0;
const aiChatMessage_1 = require("../../models/aiChatMessage");
const google_genai_1 = require("@langchain/google-genai");
const createChat = async (req, res) => {
    try {
        const userId = req.user._id;
        // Use a temporary title - we'll generate a better one after the first message
        const { title = "New Culinary Conversation" } = req.body;
        const chat = new aiChatMessage_1.Chat({
            user: userId,
            title
        });
        await chat.save();
        return res.status(201).json({
            success: true,
            message: "Chat created successfully",
            data: chat
        });
    }
    catch (error) {
        console.error("Error creating chat:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create chat",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.createChat = createChat;
const generateChatTitle = async (chatId, firstMessage) => {
    try {
        const titleGenerator = new google_genai_1.ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY || "",
            model: "gemini-1.5-flash",
            maxOutputTokens: 60,
            temperature: 0.2,
        });
        const prompt = `Create a very brief, descriptive title (5 words or less) for a culinary conversation that starts with this message: "${firstMessage}"

The title should clearly indicate the main topic or question. Don't use quotes in your response.
Examples:
- For "How do I make sourdough bread at home?" → "Homemade Sourdough Bread Guide"
- For "What are good substitutes for eggs in baking?" → "Egg Substitutes For Baking"
- For "Can you give me a weekly meal plan for a vegetarian diet?" → "Vegetarian Meal Plan" 

TITLE (5 words or less):`;
        const titleResponse = await titleGenerator.invoke(prompt);
        let title = titleResponse.content.toString().trim();
        title = title.replace(/^"(.*)"$/, '$1').replace(/^TITLE:?\s*/i, '');
        if (title.length > 50) {
            title = title.substring(0, 47) + '...';
        }
        // Update the chat with the new title
        await aiChatMessage_1.Chat.findByIdAndUpdate(chatId, { title });
        return title;
    }
    catch (error) {
        console.error("Error generating chat title:", error);
        // If title generation fails, we'll return a generic title based on the message
        const fallbackTitle = `Chat about ${firstMessage.substring(0, 30)}${firstMessage.length > 30 ? '...' : ''}`;
        await aiChatMessage_1.Chat.findByIdAndUpdate(chatId, { title: fallbackTitle });
        return fallbackTitle;
    }
};
exports.generateChatTitle = generateChatTitle;
const getChats = async (req, res) => {
    try {
        const userId = req.user._id;
        // const { limit = 20, page = 1 } = req.query;
        // const skip = (Number(page) - 1) * Number(limit);
        // Get basic chat data first
        const chats = await aiChatMessage_1.Chat.find({ user: userId })
            .sort({ updatedAt: -1 });
        // .skip(skip)
        // .limit(Number(limit));
        // const total = await Chat.countDocuments({ user: userId });
        // Get message counts for each chat
        const chatIds = chats.map(chat => chat._id);
        const messageCounts = await aiChatMessage_1.Message.aggregate([
            { $match: { chat: { $in: chatIds } } },
            { $group: { _id: '$chat', count: { $sum: 1 } } }
        ]);
        // Create a map for quick lookup of message counts
        const messageCountMap = messageCounts.reduce((acc, item) => {
            acc[item._id.toString()] = item.count;
            return acc;
        }, {});
        // Add message counts to chat objects
        const chatsWithCounts = chats.map(chat => {
            const chatObj = chat.toObject();
            chatObj.messageCount = messageCountMap[chat._id.toString()] || 0;
            chatObj.remainingMessages = 40 - chatObj.messageCount; // Based on your 40-message limit
            return chatObj;
        });
        return res.status(200).json({
            success: true,
            message: "Chats retrieved successfully",
            data: chatsWithCounts,
            // pagination: {
            //   total,
            //   page: Number(page),
            //   limit: Number(limit),
            //   pages: Math.ceil(total / Number(limit))
            // }
        });
    }
    catch (error) {
        console.error("Error getting chats:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get chats",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getChats = getChats;
const getChatMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const { chatId } = req.params;
        const { limit = 50, page = 1 } = req.query;
        const chat = await aiChatMessage_1.Chat.findOne({ _id: chatId, user: userId });
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const messages = await aiChatMessage_1.Message.find({ chat: chatId })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await aiChatMessage_1.Message.countDocuments({ chat: chatId });
        return res.status(200).json({
            success: true,
            message: "Messages retrieved successfully",
            data: messages,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error("Error getting chat messages:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get chat messages",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.getChatMessages = getChatMessages;
const deleteChat = async (req, res) => {
    try {
        const userId = req.user._id;
        const { chatId } = req.params;
        const chat = await aiChatMessage_1.Chat.findOne({ _id: chatId, user: userId });
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });
        }
        // Delete all messages in this chat
        await aiChatMessage_1.Message.deleteMany({ chat: chatId });
        // Delete the chat
        await aiChatMessage_1.Chat.deleteOne({ _id: chatId });
        return res.status(200).json({
            success: true,
            message: "Chat deleted successfully"
        });
    }
    catch (error) {
        console.error("Error deleting chat:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete chat",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.deleteChat = deleteChat;
const renameChat = async (req, res) => {
    try {
        const userId = req.user._id;
        const { chatId } = req.params;
        const { title } = req.body;
        if (!title || title.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Title is required"
            });
        }
        const chat = await aiChatMessage_1.Chat.findOne({ _id: chatId, user: userId });
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });
        }
        chat.title = title;
        await chat.save();
        return res.status(200).json({
            success: true,
            message: "Chat renamed successfully",
            data: chat
        });
    }
    catch (error) {
        console.error("Error renaming chat:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to rename chat",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.renameChat = renameChat;
const continueChat = async (req, res) => {
    try {
        const userId = req.user._id;
        const { originalChatId } = req.params;
        const originalChat = await aiChatMessage_1.Chat.findOne({ _id: originalChatId, user: userId });
        if (!originalChat) {
            return res.status(404).json({
                success: false,
                message: "Original chat not found"
            });
        }
        const newChat = new aiChatMessage_1.Chat({
            user: userId,
            title: `Continued: ${originalChat.title}`,
            lastMessage: ''
        });
        await newChat.save();
        const lastMessages = await aiChatMessage_1.Message.find({ chat: originalChatId })
            .sort({ createdAt: -1 })
            .limit(4);
        lastMessages.reverse();
        const summaryContent = `This chat continues a previous conversation. Latest context:\n\n${lastMessages.map(msg => `${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`).join('\n\n')}`;
        const summaryMessage = new aiChatMessage_1.Message({
            chat: newChat._id,
            content: summaryContent,
            role: 'assistant'
        });
        await summaryMessage.save();
        return res.status(201).json({
            success: true,
            message: "Chat continued successfully",
            data: {
                newChat,
                summaryMessage
            }
        });
    }
    catch (error) {
        console.error("Error continuing chat:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to continue chat",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.continueChat = continueChat;
