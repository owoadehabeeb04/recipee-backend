import { pull } from "langchain/hub";
import { Chat, Message } from "../../models/aiChatMessage";
import { generateChatTitle, processChatMessageStream } from "./chatController";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { GoogleCustomSearch } from "@langchain/community/tools/google_custom_search";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicTool } from "@langchain/core/tools";
import { chatbotChain } from "./botConfig";

// Modified version of processChatMessage to support both streaming and non-streaming
export const processChatMessage = async (req: any, res: any) => {
    try {
      const userId = req.user._id;
      const { chatId } = req.params;
      const { message, streaming = false } = req.body;
  
      // If streaming is requested, redirect to streaming endpoint
      if (streaming) {
        return processChatMessageStream(req, res);
      }
  
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
  
      // Save user message
      const userMessage = new Message({
        chat: chatId,
        content: message,
        role: 'user'
      });
      await userMessage.save();
  
      // Generate a title if this is the first message
      if (messageCount === 0) {
        generateChatTitle(chatId, message).catch(err => 
          console.error("Error generating title:", err)
        );
      }
  
      // Get previous messages for context
      const previousMessages = await Message.find({ chat: chatId })
        .sort({ createdAt: 1 })
        .limit(15); // Limit context to last 15 messages
  
      const messageHistory = previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
  
      // Detect if the query likely needs factual information
      const needsFactualInfo = isFactualQuery(message);
      let aiResponse;
      let isAugmentedWithSearch = false;
  
      try {
        if (needsFactualInfo) {
          // Use web search for factual queries
          isAugmentedWithSearch = true;
          aiResponse = await generateResponseWithSearch(message, messageHistory, userId);
        } else {
          // Use standard model response for non-factual queries
          aiResponse = await chatbotChain.invoke({
            input: message,
            history: messageHistory,
            user: { userId }
          });
        }
  
        // Save AI response
        const responsePrefix = isAugmentedWithSearch ? 
          "🔍 *Search-enhanced response:*\n\n" : "";
        
        const aiMessageDoc = new Message({
          chat: chatId,
          content: responsePrefix + aiResponse,
          role: 'assistant',
          metadata: {
            usedWebSearch: isAugmentedWithSearch
          }
        });
        await aiMessageDoc.save();
  
        // Update chat's last message timestamp
        chat.lastMessage = message;
        chat.updatedAt = new Date();
        await chat.save();
  
        return res.status(200).json({
          success: true,
          message: "Message processed successfully",
          data: {
            userMessage: userMessage,
            aiMessage: aiMessageDoc,
            usedWebSearch: isAugmentedWithSearch
          }
        });
  
      } catch (aiError) {
        console.error("AI processing error:", aiError);
  
        // Still save the error message in the chat
        const errorMessage = new Message({
          chat: chatId,
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
          role: 'assistant',
          metadata: {
            error: aiError instanceof Error ? aiError.message : "Unknown error"
          }
        });
        await errorMessage.save();
  
        // Return success because we did save the user message and an error response
        return res.status(200).json({
          success: true,
          message: "Message saved but AI processing failed",
          data: {
            userMessage: userMessage,
            aiMessage: errorMessage,
            error: aiError instanceof Error ? aiError.message : "Unknown error"
          }
        });
      }
  
    } catch (error) {
      console.error("Error processing chat message:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to process message",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };
  
  // Add a GET endpoint for simple message queries (optional convenience method)
  export const processChatMessageGet = async (req: any, res: any) => {
    try {
      const userId = req.user._id;
      const { chatId } = req.params;
      const { message } = req.query;
  
      if (!message || message.trim() === '') {
        return res.status(400).json({
          success: false,
          message: "Message query parameter is required"
        });
      }
  
      // Convert GET to POST format and delegate to existing function
      const modifiedReq = {
        ...req,
        body: { 
          message: decodeURIComponent(message),
          streaming: false 
        }
      };
  
      return await processChatMessage(modifiedReq, res);
    } catch (error) {
      console.error("Error in GET message endpoint:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to process message",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };
  
  export function isFactualQuery(query: string): boolean {
    // Convert to lowercase for easier matching
    const lowerQuery = query.toLowerCase();
    
    // Keywords that suggest factual information is needed
    const factualKeywords = [
      'what is', 'what are', 'who is', 'who are', 'when was', 'when is',
      'where is', 'where are', 'why is', 'why are', 'how many', 'how much',
      'record', 'tallest', 'largest', 'smallest', 'fastest', 'longest',
      'history', 'origin', 'discover', 'invented', 'founded', 'created',
      'world record', 'guinness', 'statistics', 'facts', 'data',
      'research', 'studies', 'published', 'latest', 'recent', 'news',
      'current', 'trending', 'popular', 'famous', 'best', 'top', 'ranked'
    ];
  
    // Question patterns that usually need factual information
    const questionPatterns = [
      /when (was|is|did|does|will)/i,
      /where (is|are|was|were)/i,
      /who (is|are|was|were|invented|discovered)/i,
      /what (is|are|was|were) the (most|best|largest|smallest|fastest|slowest|highest|lowest)/i,
      /how (many|much|long|old|tall|big|small)/i,
      /why (is|are|does|do|did)/i,
      /can you (find|search|tell me about|look up)/i
    ];
  
    // Check for factual keywords
    for (const keyword of factualKeywords) {
      if (lowerQuery.includes(keyword)) {
        return true;
      }
    }
  
    // Check for question patterns
    for (const pattern of questionPatterns) {
      if (pattern.test(lowerQuery)) {
        return true;
      }
    }
  
    // For culinary-specific factual queries
    const culinaryFactualPatterns = [
      /(origin|history) of .* (food|dish|cuisine|recipe|ingredient)/i,
      /nutritional (value|content|facts|information) (of|in|for)/i,
      /health (benefits|effects) of/i,
      /when (is|was) .* (invented|created|discovered|first made)/i,
      /who (invented|created|discovered|first made)/i,
      /what (is|are) the (traditional|authentic|original)/i
    ];
  
    for (const pattern of culinaryFactualPatterns) {
      if (pattern.test(lowerQuery)) {
        return true;
      }
    }
  
    return false;
  }
  
  // Function to generate responses with web search augmentation
  // Function to generate responses with web search augmentation using LangChain
  async function generateResponseWithSearch(query: string, history: any[], userId: string): Promise<string> {
    try {
      console.log("Generating search-augmented response for:", query);
      
      // Initialize Google Custom Search tool
      const googleSearchTool = new GoogleCustomSearch({
        apiKey: process.env.GOOGLE_SEARCH_API_KEY || "",
        googleCSEId: process.env.GOOGLE_CSE_ID || "",
      });
  
      // Create a custom tool for web searching that formats results nicely
      const webSearchTool = new DynamicTool({
        name: "web_search",
        description: "Useful for searching the web for current information, facts, statistics, news, and recent developments. Input should be a search query.",
        func: async (input: string) => {
          try {
            console.log("Performing web search for:", input);
            const searchResult = await googleSearchTool.call(input);
            
            // Parse and format the search results
            const formattedResults = formatSearchResults(searchResult);
            return formattedResults;
          } catch (error) {
            console.error("Search tool error:", error);
            return "Search failed: Unable to retrieve current information at this time.";
          }
        },
      });
  
      // Set up the AI model for the agent
      const model = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY || "",
        model: "gemini-2.0-flash-exp", 
        maxOutputTokens: 2048,
        temperature: 0.5,
      });
  
      // Create a custom prompt for the search agent
      const searchAgentPrompt = `You are ARIA, an advanced culinary AI assistant with web search capabilities.
  
  You have access to a web search tool that can help you find current, factual information to answer user questions accurately.
  
  When using the search tool:
  1. Search for relevant, current information
  2. Synthesize the information clearly and concisely
  3. Cite sources when appropriate using [Source: URL]
  4. Focus on culinary aspects when relevant
  5. Be honest about limitations if search results are insufficient
  
  Previous conversation context:
  ${history.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}
  
  Current date: ${new Date().toLocaleDateString()}
  
  You have access to the following tools:
  {tools}
  
  Use the following format:
  Question: the input question you must answer
  Thought: you should always think about what to do
  Action: the action to take, should be one of [{tool_names}]
  Action Input: the input to the action
  Observation: the result of the action
  ... (this Thought/Action/Action Input/Observation can repeat N times)
  Thought: I now know the final answer
  Final Answer: the final answer to the original input question
  
  Question: {input}
  {agent_scratchpad}`;
  
      try {
        // Pull the React agent prompt from LangChain hub as fallback
        const prompt: any = await pull("hwchase17/react").catch(() => {
          // If hub pull fails, use our custom prompt
          return {
            template: searchAgentPrompt,
            inputVariables: ["input", "tools", "tool_names", "agent_scratchpad"]
          };
        });
  
        // Create the agent
        const agent = await createReactAgent({
          llm: model,
          tools: [webSearchTool],
          prompt: await import("@langchain/core/prompts").then(
            module => new module.PromptTemplate({
              template: prompt.template || searchAgentPrompt,
              inputVariables: prompt.inputVariables || ["input", "tools", "tool_names", "agent_scratchpad"]
            })
          ),
        });
  
        // Create agent executor
        const agentExecutor = new AgentExecutor({
          agent,
          tools: [webSearchTool],
          verbose: true,
          maxIterations: 3,
          earlyStoppingMethod: "generate",
        });
  
        // Execute the agent
        const result = await agentExecutor.invoke({
          input: query,
        });
  
        return result.output || "I couldn't generate a response at this time.";
  
      } catch (agentError) {
        console.error("Agent execution error:", agentError);
        // Fallback to direct search if agent fails
        return await fallbackDirectSearch(query, model);
      }
  
    } catch (error) {
      console.error("Error in generateResponseWithSearch:", error);
      throw new Error(`Failed to generate search-augmented response: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  
  // Fallback function for direct search without agent
  async function fallbackDirectSearch(query: string, model: ChatGoogleGenerativeAI): Promise<string> {
    try {
      console.log("Using fallback direct search approach");
      
      const googleSearchTool = new GoogleCustomSearch({
        apiKey: process.env.GOOGLE_SEARCH_API_KEY || "",
        googleCSEId: process.env.GOOGLE_CSE_ID || "",
      });
  
      const searchResults = await googleSearchTool.call(query);
      const formattedResults = formatSearchResults(searchResults);
  
      const prompt = `You are ARIA, an advanced culinary AI assistant. I've searched the web for information about the user's question.
  
  Based on the search results below, provide a helpful, accurate response:
  
  SEARCH RESULTS:
  ${formattedResults}
  
  USER QUESTION: ${query}
  
  Please synthesize the information and provide a clear, helpful response. Cite sources when appropriate using [Source: URL].`;
  
      const response = await model.invoke(prompt);
      return response.content.toString();
    } catch (error) {
      console.error("Fallback search error:", error);
      return "I'm sorry, I couldn't retrieve current information to answer your question at this time.";
    }
  }
  
  // Helper function to format search results
  function formatSearchResults(searchResults: string): string {
    try {
      // Try to parse if it's JSON
      let results;
      try {
        results = JSON.parse(searchResults);
      } catch {
        // If not JSON, treat as plain text
        return searchResults.substring(0, 2000); // Limit length
      }
  
      if (results.items && Array.isArray(results.items)) {
        return results.items.slice(0, 5).map((item: any, index: number) => 
          `[Result ${index + 1}]
  Title: ${item.title || 'N/A'}
  URL: ${item.link || 'N/A'}
  Description: ${item.snippet || 'N/A'}
  ${item.pagemap?.metatags?.[0]?.['og:description'] ? `Additional Info: ${item.pagemap.metatags[0]['og:description']}` : ''}`
        ).join('\n\n');
      } else {
        return searchResults.substring(0, 2000);
      }
    } catch (error) {
      console.error("Error formatting search results:", error);
      return searchResults.substring(0, 2000);
    }
  }
  
  
  
  // Function to perform Google search using the Custom Search API
  export async function performGoogleSearch(query: string): Promise<{urls: string[], snippets: string}> {
    try {
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const cseId = process.env.GOOGLE_CSE_ID;
      
      if (!apiKey || !cseId) {
        throw new Error("Google Search API key or CSE ID not configured");
      }
      
      const encodedQuery = encodeURIComponent(query);
      const searchUrl = `https://customsearch.googleapis.com/customsearch/v1?cx=${cseId}&q=${encodedQuery}&key=${apiKey}&num=5`;
      
      console.log("Performing Google search...");
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google search failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return { urls: [], snippets: "No search results found." };
      }
      
      // Extract URLs from search results
      const urls = data.items.map((item: any) => item.link);
      
      // Create formatted snippets from search results
      const snippets = data.items.map((item: any, i: number) => 
        `[Result ${i+1}]
  Title: ${item.title}
  URL: ${item.link}
  Description: ${item.snippet}
  ${item.pagemap?.metatags?.[0]?.['og:description'] ? `Additional Info: ${item.pagemap.metatags[0]['og:description']}` : ''}`
      ).join('\n\n');
      
      return { urls, snippets };
    } catch (error) {
      console.error("Error performing Google search:", error);
      return { 
        urls: [], 
        snippets: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}` 
      };
    }
  }
  
  // Helper function to extract URLs from text (fallback method)
  function extractUrlsFromSearchResults(searchResults: string): string[] {
    try {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = searchResults.match(urlRegex);
      
      if (!matches) return [];
      
      // Filter out duplicates and clean up URLs
      const uniqueUrls = [...new Set(matches.map(url => {
        return url.replace(/[.,)}\]]+$/, '');
      }))];
      
      return uniqueUrls.slice(0, 5); // Limit to 5 URLs
    } catch (error) {
      console.error("Error extracting URLs from search results:", error);
      return [];
    }
  }
  