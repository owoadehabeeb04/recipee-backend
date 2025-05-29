import { Request, Response } from 'express';
import { processChatMessage } from './langchainController';
import { processChatMessageStream } from './chatController';
import { Chat, Message } from '../../models/aiChatMessage';

// Process voice message (transcription done on frontend)
export const processVoiceMessage = async (req: any, res: Response) => {
  try {
    const { chatId } = req.params;
    const { transcription } = req.body;

    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "No transcription provided"
      });
    }

    console.log('🎤 Processing voice message:', transcription);

    // Create request for your existing chat logic
    const textRequest = {
      ...req,
      body: {
        message: transcription,
        isVoiceMessage: true
      },
      params: { chatId }
    };

    // Use your existing processChatMessage function
    return await processChatMessage(textRequest, res);

  } catch (error) {
    console.error('❌ Error processing voice message:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to process voice message",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Enhanced voice streaming with smaller chunks
// export const processVoiceMessageStream = async (req: any, res: any) => {
//   try {
//     const { chatId } = req.params;
//     const { transcription } = req.body;

//     if (!transcription || transcription.trim().length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No transcription provided"
//       });
//     }

//     console.log('🎤 Processing voice stream:', transcription);

//     // Set up SSE headers ONCE
//     res.writeHead(200, {
//       'Content-Type': 'text/event-stream',
//       'Cache-Control': 'no-cache',
//       'Connection': 'keep-alive',
//       'Access-Control-Allow-Origin': '*',
//     });

//     // Create request for streaming
//     const streamRequest = {
//       ...req,
//       body: {
//         message: transcription,
//         isVoiceMessage: true
//       },
//       params: { chatId }
//     };

//     // Create a modified response object that prevents header setting
//     const modifiedRes = Object.assign({}, res, {
//       writeHead: () => res, // Prevent writeHead from being called again
//       setHeader: () => res, // Prevent setHeader from being called again
//       write: res.write.bind(res),
//       end: res.end.bind(res)
//     }) as unknown as Response;

//     // Intercept the write method to break chunks into smaller pieces
//     const originalWrite = res.write.bind(res);
    
//     modifiedRes.write = (chunk: any) => {
//       if (typeof chunk === 'string' && chunk.startsWith('data: ')) {
//         try {
//           const dataStr = chunk.replace('data: ', '').replace('\n\n', '');
//           const data = JSON.parse(dataStr);

//           // Handle different chunk types
//           if (data.type === 'chunk' && data.data?.content) {
//             const content = data.data.content;
            
//             // Break large content into smaller chunks
//             const smallChunks = breakIntoSmallerChunks(content);
            
//             for (const smallChunk of smallChunks) {
//               const smallChunkData = {
//                 ...data,
//                 data: {
//                   ...data.data,
//                   content: smallChunk
//                 }
//               };
              
//               originalWrite(`data: ${JSON.stringify(smallChunkData)}\n\n`);
//             }
            
//             return true;
//           } else {
//             // For non-content chunks (status, complete, etc.), send as-is
//             return originalWrite(chunk);
//           }
//         } catch (e) {
//           // If parsing fails, use original chunk
//           return originalWrite(chunk);
//         }
//       }
      
//       return originalWrite(chunk);
//     };

//     // Use your existing streaming function with modified response
//     await processChatMessageStream(streamRequest, modifiedRes);

//   } catch (error) {
//     console.error('❌ Error in voice stream:', error);
    
//     // Only try to write if headers haven't been sent yet
//     if (!res.headersSent) {
//       res.write(`data: ${JSON.stringify({ 
//         type: 'error', 
//         message: 'Failed to process voice message' 
//       })}\n\n`);
//     }
//     res.end();
//   }
// };

// // Helper function to break content into smaller, natural chunks
// function breakIntoSmallerChunks(content: string): string[] {
//   const chunks: string[] = [];
  
//   // Target chunk size (characters)
//   const targetChunkSize = 15; // Adjust this for chunk size preference
  
//   // Split by words to avoid breaking words
//   const words = content.split(' ');
//   let currentChunk = '';
  
//   for (const word of words) {
//     // If adding this word would exceed target size, push current chunk
//     if (currentChunk.length + word.length + 1 > targetChunkSize && currentChunk.length > 0) {
//       chunks.push(currentChunk);
//       currentChunk = word;
//     } else {
//       // Add word to current chunk
//       currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
//     }
//   }
  
//   // Don't forget the last chunk
//   if (currentChunk.length > 0) {
//     chunks.push(currentChunk);
//   }
  
//   return chunks;
// }

// // Alternative: Break by characters with word awareness
// function breakIntoSmallerChunksAlternative(content: string): string[] {
//   const chunks: string[] = [];
//   const chunkSize = 20; // Characters per chunk
  
//   for (let i = 0; i < content.length; i += chunkSize) {
//     let chunk = content.substring(i, i + chunkSize);
    
//     // If we're not at the end and we cut off mid-word, 
//     // try to find a better breaking point
//     if (i + chunkSize < content.length && !/\s/.test(content[i + chunkSize])) {
//       const lastSpaceIndex = chunk.lastIndexOf(' ');
//       if (lastSpaceIndex > chunkSize / 2) { // Only if the space isn't too early
//         chunk = chunk.substring(0, lastSpaceIndex);
//         i = i + lastSpaceIndex - chunkSize; // Adjust index
//       }
//     }
    
//     chunks.push(chunk);
//   }
  
//   return chunks;
// }

// Helper function for delay
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}





// Enhanced voice streaming controller
export const processVoiceMessageStream = async (req: any, res: any) => {
    try {
      const { chatId } = req.params;
      const { transcription } = req.body;
  
      if (!transcription || transcription.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "No transcription provided"
        });
      }
  
      console.log('🎤 Processing voice stream:', transcription);
  
      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
  
      // Send initial status
      res.write(`data: ${JSON.stringify({
        type: 'status',
        data: { message: 'Processing transcription...' }
      })}\n\n`);
  
      // Create a custom streaming handler
      const streamHandler = {
        sendChunk: (content: string) => {
          // Break content into smaller, more natural chunks
          const chunks = breakIntoNaturalChunks(content);
          
          for (const chunk of chunks) {
            if (chunk.trim()) {
              res.write(`data: ${JSON.stringify({
                type: 'chunk',
                data: { content: chunk }
              })}\n\n`);
            }
          }
        },
        
        sendStatus: (message: string, usedWebSearch = false) => {
          res.write(`data: ${JSON.stringify({
            type: 'status',
            data: { message, usedWebSearch }
          })}\n\n`);
        },
        
        sendComplete: (aiMessage: any) => {
          res.write(`data: ${JSON.stringify({
            type: 'complete',
            data: { aiMessage }
          })}\n\n`);
          res.end();
        },
        
        sendError: (error: string) => {
          res.write(`data: ${JSON.stringify({
            type: 'error',
            data: { message: error }
          })}\n\n`);
          res.end();
        }
      };
  
      // Process the chat message with custom streaming
      await processChatMessageWithCustomStream(chatId, transcription, streamHandler, req);
  
    } catch (error) {
      console.error('❌ Error in voice stream:', error);
      
      if (!res.headersSent) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });
      }
      
      if (!res.destroyed) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          data: { message: 'Failed to process voice message' }
        })}\n\n`);
        res.end();
      }
    }
  };
  
  // Custom chat processing function that integrates with your existing logic
  async function processChatMessageWithCustomStream(
    chatId: string, 
    message: string, 
    streamHandler: any, 
    res: any
  ) {
    try {
      // Get chat and validate
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
  
      // Create user message
      const userMessage = new Message({
        chat: chatId,
        role: 'user',
        content: message,
        timestamp: new Date()
      });
      await userMessage.save();
  
      // Send user message confirmation
      res.write(`data: ${JSON.stringify({
        type: 'user_message',
        data: userMessage
      })}\n\n`);
  
      // Update status
      streamHandler.sendStatus('Generating response...');
  
      // Create AI message placeholder
      const aiMessage = new Message({
        chat: chatId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      });
  
      // Get AI response with streaming
      let fullContent = '';
      
      // Replace this with your actual AI service call
      // Example with OpenAI-style streaming:
    //   const aiResponse = await getAIResponseStream(message, {
    //     onChunk: (chunk: string) => {
    //       fullContent += chunk;
    //       streamHandler.sendChunk(chunk);
    //     },
    //     onComplete: () => {
    //       // Save the complete message
    //       aiMessage.content = fullContent;
    //       aiMessage.save().then(() => {
    //         // Update chat info
    //         const chatInfo = {
    //           messageCount: chat.messages.length + 2, // +2 for user and AI message
    //           totalLimit: chat.messageLimit || 100,
    //           remainingPairs: Math.floor((chat.messageLimit - chat.messages.length - 2) / 2),
    //           isApproachingLimit: (chat.messages.length + 2) > (chat.messageLimit * 0.8)
    //         };
  
    //         streamHandler.sendComplete({
    //           ...aiMessage.toObject(),
    //           chatInfo
    //         });
    //       });
    //     },
    //     onError: (error: string) => {
    //       streamHandler.sendError(error);
    //     }
    //   });
  
    } catch (error: any) {
      console.error('Error in chat processing:', error);
      streamHandler.sendError(error.message || 'Unknown error occurred');
    }
  }
  
  // Improved chunk breaking function
  function breakIntoNaturalChunks(content: string): string[] {
    const chunks: string[] = [];
    
    // Ideal chunk size - adjust based on preference
    const minChunkSize = 8;
    const maxChunkSize = 20;
    
    // Split by words first
    const words = content.split(' ');
    let currentChunk = '';
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testChunk = currentChunk + (currentChunk ? ' ' : '') + word;
      
      // If adding this word would exceed max size, push current chunk
      if (testChunk.length > maxChunkSize && currentChunk.length >= minChunkSize) {
        chunks.push(currentChunk);
        currentChunk = word;
      } else {
        currentChunk = testChunk;
      }
    }
    
    // Add the last chunk if it exists
    if (currentChunk.trim()) {
      chunks.push(currentChunk);
    }
    
    return chunks.filter(chunk => chunk.trim().length > 0);
  }
  
  // Alternative: Character-based chunking for very smooth streaming
  function breakIntoCharacterChunks(content: string, chunkSize: number = 3): string[] {
    const chunks: string[] = [];
    
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }
  
  // Mock AI response function - replace with your actual AI service
//   async function getAIResponseStream(
//     message: string, 
//     callbacks: {
//       onChunk: (chunk: string) => void;
//       onComplete: () => void;
//       onError: (error: string) => void;
//     }
//   ) {
//     try {
//       // Replace this with your actual AI service call (OpenAI, Anthropic, etc.)
//       // Example for OpenAI:
//       /*
//       const stream = await openai.chat.completions.create({
//         model: "gpt-3.5-turbo",
//         messages: [{ role: "user", content: message }],
//         stream: true,
//       });
  
//       for await (const chunk of stream) {
//         const content = chunk.choices[0]?.delta?.content || '';
//         if (content) {
//           callbacks.onChunk(content);
//         }
//       }
//       */
      
//       // Mock implementation for testing:
//       const mockResponse = "Here's a great pasta recipe! First, boil water in a large pot. Add salt to the water. Then add your pasta and cook for 8-10 minutes until al dente.";
//       const words = mockResponse.split(' ');
      
//       for (const word of words) {
//         callbacks.onChunk(word + ' ');
//         // Small delay to simulate streaming
//         await new Promise(resolve => setTimeout(resolve, 100));
//       }
      
//       callbacks.onComplete();
      
//     } catch (error: any) {
//       callbacks.onError(error.message || 'AI service error');
//     }
//   }