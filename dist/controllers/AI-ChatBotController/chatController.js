"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processChatMessageStream = exports.continueChat = exports.renameChat = exports.deleteChat = exports.getChatMessages = exports.getChats = exports.generateChatTitle = exports.createChat = void 0;
const aiChatMessage_1 = require("../../models/aiChatMessage");
const google_genai_1 = require("@langchain/google-genai");
const messages_1 = require("@langchain/core/messages");
const langchainController_1 = require("./langchainController");
const createChat = async (req, res) => {
    try {
        const userId = req.user._id;
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
            model: "gemini-2.0-flash-exp",
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
        // Get basic chat data first
        const chats = await aiChatMessage_1.Chat.find({ user: userId })
            .sort({ updatedAt: -1 });
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
            chatObj.remainingMessages = 40 - chatObj.messageCount;
            return chatObj;
        });
        return res.status(200).json({
            success: true,
            message: "Chats retrieved successfully",
            data: chatsWithCounts,
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
// New streaming endpoint for real-time responses
const processChatMessageStream = async (req, res) => {
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
        // Count existing messages
        const messageCount = await aiChatMessage_1.Message.countDocuments({ chat: chatId });
        if (messageCount >= 40) {
            return res.status(400).json({
                success: false,
                message: "Message limit reached for this chat"
            });
        }
        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });
        try {
            // Save user message
            const userMessage = new aiChatMessage_1.Message({
                chat: chatId,
                content: message,
                role: 'user'
            });
            await userMessage.save();
            // Send user message confirmation
            res.write(`data: ${JSON.stringify({
                type: 'user_message',
                data: userMessage
            })}\n\n`);
            // Generate a title if this is the first message
            if (messageCount === 0) {
                (0, exports.generateChatTitle)(chatId, message).catch(err => console.error("Error generating title:", err));
            }
            // Get previous messages for context
            const previousMessages = await aiChatMessage_1.Message.find({ chat: chatId })
                .sort({ createdAt: 1 })
                .limit(15);
            const messageHistory = previousMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            // Detect if the query likely needs factual information
            const needsFactualInfo = (0, langchainController_1.isFactualQuery)(message);
            let fullResponse = '';
            let isAugmentedWithSearch = false;
            // Send processing status
            res.write(`data: ${JSON.stringify({
                type: 'status',
                data: {
                    message: needsFactualInfo ? 'Searching for current information...' : 'Generating response...',
                    usedWebSearch: needsFactualInfo
                }
            })}\n\n`);
            if (needsFactualInfo) {
                isAugmentedWithSearch = true;
                fullResponse = await generateResponseWithSearchStream(message, messageHistory, userId, res);
            }
            else {
                fullResponse = await generateResponseStream(message, messageHistory, userId, res);
            }
            // Save AI response
            const responsePrefix = isAugmentedWithSearch ?
                "🔍 *Search-enhanced response:*\n\n" : "";
            const aiMessageDoc = new aiChatMessage_1.Message({
                chat: chatId,
                content: responsePrefix + fullResponse,
                role: 'assistant',
                metadata: {
                    usedWebSearch: isAugmentedWithSearch
                }
            });
            await aiMessageDoc.save();
            // Send completion event
            res.write(`data: ${JSON.stringify({
                type: 'complete',
                data: {
                    aiMessage: aiMessageDoc,
                    usedWebSearch: isAugmentedWithSearch
                }
            })}\n\n`);
            // Update chat's last message timestamp
            chat.lastMessage = message;
            chat.updatedAt = new Date();
            await chat.save();
        }
        catch (error) {
            console.error("Streaming error:", error);
            res.write(`data: ${JSON.stringify({
                type: 'error',
                data: { message: 'An error occurred while processing your message.' }
            })}\n\n`);
        }
        res.end();
    }
    catch (error) {
        console.error("Error in streaming endpoint:", error);
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Failed to process message",
                error: error instanceof Error ? error.message : "Unknown error"
            });
        }
    }
};
exports.processChatMessageStream = processChatMessageStream;
// Streaming version of response generation
async function generateResponseStream(message, history, userId, res) {
    try {
        const model = new google_genai_1.ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY || "",
            model: "gemini-2.0-flash-exp",
            maxOutputTokens: 2048,
            temperature: 0.7,
            streaming: true
        });
        // Convert history to proper message format
        const messages = [
            new messages_1.SystemMessage(`You are ARIA, an advanced culinary AI assistant. You specialize in cooking, recipes, nutrition, food science, and all culinary-related topics. Provide helpful, accurate, and engaging responses.

Current date: ${new Date().toLocaleDateString()}`),
            ...history.map(msg => msg.role === 'user'
                ? new messages_1.HumanMessage(msg.content)
                : new messages_1.AIMessage(msg.content)),
            new messages_1.HumanMessage(message)
        ];
        let fullResponse = '';
        // Stream the response
        const stream = await model.stream(messages);
        for await (const chunk of stream) {
            const content = chunk.content;
            if (content) {
                fullResponse += content;
                // Send chunk to client
                res.write(`data: ${JSON.stringify({
                    type: 'chunk',
                    data: { content }
                })}\n\n`);
            }
        }
        return fullResponse;
    }
    catch (error) {
        console.error("Error in generateResponseStream:", error);
        throw error;
    }
}
// Streaming version of search-augmented response generation
async function generateResponseWithSearchStream(query, history, userId, res) {
    try {
        // First perform the search
        res.write(`data: ${JSON.stringify({
            type: 'status',
            data: { message: 'Searching the web...' }
        })}\n\n`);
        const searchResults = await (0, langchainController_1.performGoogleSearch)(query);
        res.write(`data: ${JSON.stringify({
            type: 'status',
            data: { message: 'Processing search results...' }
        })}\n\n`);
        // Now generate streaming response with search context
        const model = new google_genai_1.ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY || "",
            model: "gemini-2.0-flash-exp",
            maxOutputTokens: 2048,
            temperature: 0.5,
            streaming: true
        });
        const searchContext = searchResults.snippets;
        const prompt = `You are ARIA, an advanced culinary AI assistant with access to current web information.

Based on the search results below, provide a helpful, accurate response to the user's question:

SEARCH RESULTS:
${searchContext}

CONVERSATION HISTORY:
${history.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

USER QUESTION: ${query}

Please synthesize the information and provide a clear, helpful response. When appropriate, mention that you've searched for current information. Focus on culinary aspects when relevant.

Current date: ${new Date().toLocaleDateString()}`;
        let fullResponse = '';
        res.write(`data: ${JSON.stringify({
            type: 'status',
            data: { message: 'Generating response...' }
        })}\n\n`);
        // Stream the response
        const stream = await model.stream([new messages_1.HumanMessage(prompt)]);
        for await (const chunk of stream) {
            const content = chunk.content;
            if (content) {
                fullResponse += content;
                // Send chunk to client
                res.write(`data: ${JSON.stringify({
                    type: 'chunk',
                    data: { content }
                })}\n\n`);
            }
        }
        return fullResponse;
    }
    catch (error) {
        console.error("Error in generateResponseWithSearchStream:", error);
        // Fallback to non-streaming response
        res.write(`data: ${JSON.stringify({
            type: 'status',
            data: { message: 'Falling back to standard response...' }
        })}\n\n`);
        return await generateResponseStream(query, history, userId, res);
    }
}
