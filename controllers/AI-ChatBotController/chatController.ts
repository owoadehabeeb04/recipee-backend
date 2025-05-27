import { Chat, Message } from "../../models/aiChatMessage";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { GoogleCustomSearch } from "@langchain/community/tools/google_custom_search";
import { DynamicTool } from "@langchain/core/tools";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { pull } from "langchain/hub";
import { chatbotChain } from "./botConfig";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { isFactualQuery, performGoogleSearch } from "./langchainController";

export const createChat = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { title = "New Culinary Conversation" } = req.body;
    
    const chat = new Chat({
      user: userId,
      title
    });
    
    await chat.save();
    
    return res.status(201).json({
      success: true,
      message: "Chat created successfully",
      data: chat
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create chat",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const generateChatTitle = async (chatId: string, firstMessage: string): Promise<string> => {
  try {
    const titleGenerator = new ChatGoogleGenerativeAI({
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
    await Chat.findByIdAndUpdate(chatId, { title });
    
    return title;
  } catch (error) {
    console.error("Error generating chat title:", error);
    // If title generation fails, we'll return a generic title based on the message
    const fallbackTitle = `Chat about ${firstMessage.substring(0, 30)}${firstMessage.length > 30 ? '...' : ''}`;
    await Chat.findByIdAndUpdate(chatId, { title: fallbackTitle });
    return fallbackTitle;
  }
};

export const getChats = async (req: any, res: any) => {
    try {
      const userId = req.user._id;
    
      // Get basic chat data first
      const chats = await Chat.find({ user: userId })
        .sort({ updatedAt: -1 });
        
      
      // Get message counts for each chat
      const chatIds = chats.map(chat => chat._id);
      const messageCounts = await Message.aggregate([
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
    } catch (error) {
      console.error("Error getting chats:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get chats",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

export const getChatMessages = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { chatId } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    const chat = await Chat.findOne({ _id: chatId, user: userId });
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found"
      });
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const messages = await Message.find({ chat: chatId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Message.countDocuments({ chat: chatId });
    
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
  } catch (error) {
    console.error("Error getting chat messages:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get chat messages",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};


export const deleteChat = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { chatId } = req.params;
    
    const chat = await Chat.findOne({ _id: chatId, user: userId });
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found"
      });
    }
    
    // Delete all messages in this chat
    await Message.deleteMany({ chat: chatId });
    
    // Delete the chat
    await Chat.deleteOne({ _id: chatId });
    
    return res.status(200).json({
      success: true,
      message: "Chat deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete chat",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};


export const renameChat = async (req: any, res: any) => {
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
    
    const chat = await Chat.findOne({ _id: chatId, user: userId });
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
  } catch (error) {
    console.error("Error renaming chat:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to rename chat",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};


export const continueChat = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { originalChatId } = req.params;
    
    const originalChat = await Chat.findOne({ _id: originalChatId, user: userId });
    if (!originalChat) {
      return res.status(404).json({
        success: false,
        message: "Original chat not found"
      });
    }
    
    const newChat = new Chat({
      user: userId,
      title: `Continued: ${originalChat.title}`,
      lastMessage: ''
    });
    
    await newChat.save();
    
    const lastMessages = await Message.find({ chat: originalChatId })
      .sort({ createdAt: -1 })
      .limit(4);
    
    lastMessages.reverse();
    
    const summaryContent = `This chat continues a previous conversation. Latest context:\n\n${
      lastMessages.map(msg => `${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`).join('\n\n')
    }`;
    
    const summaryMessage = new Message({
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
  } catch (error) {
    console.error("Error continuing chat:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to continue chat",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// New streaming endpoint for real-time responses
export const processChatMessageStream = async (req: any, res: any) => {
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

    const chat = await Chat.findOne({ _id: chatId, user: userId });
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found"
      });
    }

    // Count existing messages
    const messageCount = await Message.countDocuments({ chat: chatId });
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
      const userMessage = new Message({
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
        generateChatTitle(chatId, message).catch(err => 
          console.error("Error generating title:", err)
        );
      }

      // Get previous messages for context
      const previousMessages = await Message.find({ chat: chatId })
        .sort({ createdAt: 1 })
        .limit(15);

      const messageHistory = previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Detect if the query likely needs factual information
      const needsFactualInfo = isFactualQuery(message);
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
      } else {
        fullResponse = await generateResponseStream(message, messageHistory, userId, res);
      }

      // Save AI response
      const responsePrefix = isAugmentedWithSearch ? 
        "🔍 *Search-enhanced response:*\n\n" : "";
      
      const aiMessageDoc = new Message({
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

    } catch (error) {
      console.error("Streaming error:", error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        data: { message: 'An error occurred while processing your message.' }
      })}\n\n`);
    }

    res.end();

  } catch (error) {
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

// Streaming version of response generation
async function generateResponseStream(message: string, history: any[], userId: string, res: any): Promise<string> {
  try {
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY || "",
      model: "gemini-2.0-flash-exp",
      maxOutputTokens: 2048,
      temperature: 0.7,
      streaming: true
    });

    // Convert history to proper message format
    const messages = [
      new SystemMessage(`You are ARIA, an advanced culinary AI assistant. You specialize in cooking, recipes, nutrition, food science, and all culinary-related topics. Provide helpful, accurate, and engaging responses.

Current date: ${new Date().toLocaleDateString()}`),
      ...history.map(msg => 
        msg.role === 'user' 
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      ),
      new HumanMessage(message)
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
  } catch (error) {
    console.error("Error in generateResponseStream:", error);
    throw error;
  }
}

// Streaming version of search-augmented response generation
async function generateResponseWithSearchStream(query: string, history: any[], userId: string, res: any): Promise<string> {
  try {
    // First perform the search
    res.write(`data: ${JSON.stringify({
      type: 'status',
      data: { message: 'Searching the web...' }
    })}\n\n`);

    const searchResults = await performGoogleSearch(query);
    
    res.write(`data: ${JSON.stringify({
      type: 'status',
      data: { message: 'Processing search results...' }
    })}\n\n`);

    // Now generate streaming response with search context
    const model = new ChatGoogleGenerativeAI({
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
    const stream = await model.stream([new HumanMessage(prompt)]);
    
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
  } catch (error) {
    console.error("Error in generateResponseWithSearchStream:", error);
    
    // Fallback to non-streaming response
    res.write(`data: ${JSON.stringify({
      type: 'status',
      data: { message: 'Falling back to standard response...' }
    })}\n\n`);
    
    return await generateResponseStream(query, history, userId, res);
  }
}
