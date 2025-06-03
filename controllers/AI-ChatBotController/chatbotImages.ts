import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { MessageHandler } from '../AI-ChatBotController/messageHandler';
import { Chat, Message } from '../../models/aiChatMessage';
import { GeminiImageAnalyzer } from '../../services/imageAnalayzer';
// Import the TensorFlow-based image analyzer
const originalConsoleLog = console.log;

console.log('BLESSINGGG')
console.log = function(...args) {
    originalConsoleLog("CUSTOM LOG:", ...args);
    // Also write to a file to ensure logs are captured
    try { 
      const logMessage = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : arg
      ).join(' ');
      fs.appendFileSync(
        path.join(process.cwd(), 'debug.log'), 
        `[${new Date().toISOString()}] ${logMessage}\n`
      );
    } catch (e) {}
  };
  
  // Then test it
  console.log("TEST LOG - CAN YOU SEE ME?");
// Ensure upload directory exists
const ensureUploadDirExists = () => {
  const uploadDir = path.join(process.cwd(), 'uploads/chat-images');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created upload directory: ${uploadDir}`);
  }
};

// Call this when your application starts
ensureUploadDirExists();

// Helper function to download image from URL
async function downloadImage(imageUrl: string): Promise<string> {
  try {
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'arraybuffer'
    });
    
    // Create a unique filename
    const filename = `cloudinary_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
    const filePath = path.join(process.cwd(), 'uploads/chat-images', filename);
    
    // Save the image
    fs.writeFileSync(filePath, response.data);
    console.log(`Downloaded image from Cloudinary to: ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('Failed to download image from URL:', error);
    throw new Error('Failed to download image from URL');
  }
}

// Process a single image message (supports both file uploads and Cloudinary URLs)
export const processImageMessage = async (req: any, res: any) => {
    console.log('ENTERRR!')
    try {
      const userId = req.user._id;
      const { chatId } = req.params;
      const { message, imageUrl } = req.body;
      
      console.log('Received image request with URL:', imageUrl);
      
      // Check if we have an image URL
      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: "No image was provided (upload or URL)"
        });
      }
      
      // Find the chat
      const chat = await Chat.findOne({ _id: chatId, user: userId });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found"
        });
      }
      
      // Determine the image source and path
      let fullImagePath: string;
      
      try {
        console.log('Downloading image from Cloudinary URL');
        fullImagePath = await downloadImage(imageUrl);
        console.log('Image downloaded successfully to:', fullImagePath);
      } catch (error) {
        console.error('Failed to download image:', error);
        return res.status(400).json({
          success: false,
          message: "Failed to process the image URL"
        });
      }
      
      // Verify the image exists locally
      if (!fs.existsSync(fullImagePath)) {
        console.error(`File does not exist: ${fullImagePath}`);
        return res.status(400).json({
          success: false,
          message: "Image file not found on server"
        });
      }
      
      try {
        console.log(`Analyzing image: ${fullImagePath}`);
        
        const imageAnalysis = await GeminiImageAnalyzer.analyzeImage(fullImagePath);
        
        console.log('Image analysis results:', imageAnalysis);
        
        // Create the image object
        const imageObject = {
          url: imageUrl,
          caption: message || '',
          analysis: imageAnalysis
        };
        
        // Create the message with images
        const userMessage = new Message({
          chat: chatId,
          content: message || "Image shared",
          role: 'user',
          hasImages: true, // Explicitly set
          images: [imageObject]
        });
        
        console.log('Before save - hasImages:', userMessage.hasImages);
        console.log('Before save - image count:', userMessage.images?.length);
        
        // Save the message
        await userMessage.save();
        
        // Retrieve the saved message
        const savedMessage = await Message.findById(userMessage._id);
        console.log('After save - hasImages:', savedMessage.hasImages);
        console.log('After save - image count:', savedMessage.images?.length);
        
        // Update chat's last message and activity
        chat.lastMessage = message || "Shared an image";
        chat.updatedAt = new Date();
        await chat.save();
        
        // Generate AI response
        let aiResponse = await generateAIResponseForImage(savedMessage, userId);
        
        // Save AI response
        const assistantMessage = new Message({
          chat: chatId,
          content: aiResponse,
          role: 'assistant'
        });
        await assistantMessage.save();
        
        // Create a custom response object that ensures images are included
        const responseData = {
          userMessage: {
            _id: savedMessage._id,
            chat: savedMessage.chat,
            content: savedMessage.content,
            role: savedMessage.role,
            createdAt: savedMessage.createdAt,
            updatedAt: savedMessage.updatedAt,
            hasImages: true, // Force true
            images: [imageObject], // Explicitly include the image
            isStreaming: savedMessage.isStreaming || false,
            feedback: savedMessage.feedback
          },
          aiMessage: assistantMessage,
          usedWebSearch: false
        };
        
        return res.status(200).json({
          success: true,
          message: "Image processed successfully",
          data: responseData
        });
      } catch (analyzeError) {
        console.error('Image analysis failed:', analyzeError);
        return res.status(500).json({
          success: false, 
          message: "Failed to analyze image",
          error: analyzeError instanceof Error ? analyzeError.message : "Unknown error"
        });
      }
    } catch (error) {
      console.error("Error processing image message:", error);
      return res.status(500).json({
        success: false, 
        message: "Failed to process image message",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

// Process multiple images (supports both file uploads and Cloudinary URLs)
export const processMultiImageMessage = async (req: any, res: any) => {
    try {
      ensureUploadDirExists();
      
      const userId = req.user._id;
      const { chatId } = req.params;
      const { message, imageUrls } = req.body; 
      
      console.log('Processing multiple images:', imageUrls?.length || 0);
      
      // Check if we have either file uploads or image URLs
      if ((!req.files || req.files.length === 0) && (!imageUrls || imageUrls.length === 0)) {
        return res.status(400).json({
          success: false,
          message: "No images were provided (uploads or URLs)"
        });
      }
      
      // Find the chat
      const chat = await Chat.findOne({ _id: chatId, user: userId });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found"
        });
      }
      
      const imagePromises = [];
      const processedImages: any = []; // Store processed images
      
      // Process file uploads if any
      if (req.files && req.files.length > 0) {
        console.log(`Processing ${req.files.length} uploaded files`);
        const filePromises = req.files.map(async (file: Express.Multer.File) => {
          const imageUrl = `/uploads/chat-images/${file.filename}`;
          const fullPath = path.join(process.cwd(), 'uploads/chat-images', file.filename);
          
          try {
            // Use TensorFlow analyzer for each image
            const imageAnalysis = await GeminiImageAnalyzer.analyzeImage(fullPath);
            
            const imageObject = {
              url: imageUrl,
              caption: '',
              analysis: imageAnalysis
            };
            
            processedImages.push(imageObject);
            return imageObject;
          } catch (error) {
            console.error(`Analysis failed for image ${file.filename}:`, error);
            const imageObject = {
              url: imageUrl,
              caption: '',
              analysis: {
                tags: ['image'],
                description: 'Uploaded image',
                confidence: 0,
                foodRecognition: { isDish: false }
              }
            };
            processedImages.push(imageObject);
            return imageObject;
          }
        });
        
        imagePromises.push(...filePromises);
      }
      
      // Process Cloudinary URLs if any
      if (imageUrls && imageUrls.length > 0) {
        console.log(`Processing ${imageUrls.length} Cloudinary URLs`);
        const urlPromises = imageUrls.map(async (url: string) => {
          try {
            // Download the image for analysis
            const downloadedPath = await downloadImage(url);
            
            // Analyze the image
            const imageAnalysis = await GeminiImageAnalyzer.analyzeImage(downloadedPath);
            
            const imageObject = {
              url: url, // Store original Cloudinary URL
              caption: '',
              analysis: imageAnalysis
            };
            
            processedImages.push(imageObject);
            return imageObject;
          } catch (error) {
            console.error(`Analysis failed for image URL ${url}:`, error);
            const imageObject = {
              url: url,
              caption: '',
              analysis: {
                tags: ['image'],
                description: 'Cloudinary image',
                confidence: 0,
                foodRecognition: { isDish: false }
              }
            };
            processedImages.push(imageObject);
            return imageObject;
          }
        });
        
        imagePromises.push(...urlPromises);
      }
      
      // Wait for all image processing to complete
      await Promise.all(imagePromises);
      
      // Count total images
      const totalImages = processedImages.length;
      console.log(`Processed ${totalImages} total images`);
      
      // Create the message with all processed images
      const userMessageData = {
        chat: chatId,
        content: message || `Shared ${totalImages} images`,
        role: 'user',
        hasImages: true,
        images: processedImages
      };
      
      console.log('Creating user message with data:', { 
        hasImages: userMessageData.hasImages, 
        imageCount: userMessageData.images.length 
      });
      
      // Create and save the message
      const userMessage = new Message(userMessageData);
      await userMessage.save();
      
      // Verify what was saved
      const savedMessage = await Message.findById(userMessage._id);
      console.log('Retrieved after save:', {
        hasImages: savedMessage.hasImages,
        imageCount: savedMessage.images?.length || 0
      });
      
      // Update chat's last message and activity
      chat.lastMessage = message || `Shared ${totalImages} images`;
      chat.updatedAt = new Date();
      await chat.save();
      
      // Generate AI response based on multiple images
      let aiResponse = await generateAIResponseForMultipleImages(savedMessage, userId);
      
      // Save AI response
      const assistantMessage = new Message({
        chat: chatId,
        content: aiResponse,
        role: 'assistant'
      });
      await assistantMessage.save();
      
      // IMPORTANT: Create a structured response with explicit image data
      const responseData = {
        userMessage: {
          _id: savedMessage._id,
          chat: savedMessage.chat,
          content: savedMessage.content,
          role: savedMessage.role,
          createdAt: savedMessage.createdAt,
          updatedAt: savedMessage.updatedAt,
          hasImages: true,  // Explicitly set to true
          images: processedImages  // Include the processed images
        },
        aiMessage: assistantMessage,
        usedWebSearch: false
      };
      
      console.log('Sending response with images:', {
        hasImages: responseData.userMessage.hasImages,
        imageCount: responseData.userMessage.images.length
      });
      
      return res.status(200).json({
        success: true,
        message: "Images processed successfully",
        data: responseData
      });
      
    } catch (error) {
      console.error("Error processing multi-image message:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to process images",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

// Helper function to generate AI response for image
async function generateAIResponseForImage(message: any, userId: string): Promise<string> {
  try {
    const image = message.images[0];
    const textPrompt = message.content || '';
    
    // If this is a food image
    if (image.analysis?.foodRecognition?.isDish) {
      const dishName = image.analysis.foodRecognition.dishName;
      const ingredients = image.analysis.foodRecognition.ingredients;
      
      // For dishes with ingredients
      if (ingredients && ingredients.length > 0) {
        return `I see you've shared an image of ${dishName}! This dish typically contains ${ingredients.join(', ')}. Would you like me to:
      
1. Find similar recipes in your collection
2. Provide nutritional information about this dish
3. Create a recipe based on what I see in the image`;
      } else {
        return `I see you've shared an image of what appears to be ${dishName}! Would you like me to:
        
1. Find recipes for this dish
2. Suggest ingredients you might need
3. Tell you about this type of cuisine`;
      }
    }
    
    // For general images
    return `Thanks for sharing this image${textPrompt ? ': ' + textPrompt : ''}. 
    
Based on what I can see, this appears to be ${image.analysis.description}. How can I help you with this?`;
  } catch (error) {
    console.error("Error generating AI response for image:", error);
    return "I received your image, but I'm having trouble analyzing it right now. How can I help you with this?";
  }
}

// Helper function to generate AI response for multiple images
async function generateAIResponseForMultipleImages(message: any, userId: string): Promise<string> {
  try {
    const images = message.images;
    const textPrompt = message.content || '';
    
    interface FoodRecognition {
        isDish: boolean;
        dishName: string;
        ingredients: string[];
    }

    interface ImageAnalysis {
        description?: string;
        foodRecognition?: FoodRecognition;
    }

    interface Image {
        url: string;
        caption: string;
        analysis?: ImageAnalysis;
    }

    const foodImages: Image[] = images.filter((img: Image) => img.analysis?.foodRecognition?.isDish);
    
    if (foodImages.length > 0) {
      // If most images are food
      if (foodImages.length === images.length) {
        return `Thank you for sharing these ${images.length} food images${textPrompt ? ': ' + textPrompt : ''}. 
        
I can see dishes like ${foodImages.map(img => img.analysis?.foodRecognition?.dishName || 'a dish').join(', ')}. Would you like me to:

1. Compare these dishes nutritionally
2. Suggest recipes based on these images
3. Create a meal plan incorporating similar dishes`;
      }
      
      // Mixed content
      return `Thanks for sharing these ${images.length} images${textPrompt ? ': ' + textPrompt : ''}. 
      
Some of them appear to be food dishes like ${foodImages.map(img => img.analysis?.foodRecognition?.dishName || 'a dish').join(', ')}. Which ones would you like me to focus on?`;
    }
    
    // Non-food images
    return `Thanks for sharing these ${images.length} images${textPrompt ? ': ' + textPrompt : ''}. How would you like me to help with these?`;
  } catch (error) {
    console.error("Error generating AI response for multiple images:", error);
    return `I received your ${message.images.length} images, but I'm having trouble analyzing them right now. How can I help you with these?`;
  }
}