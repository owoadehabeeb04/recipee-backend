import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

export class GeminiImageAnalyzer {
  private static apiKey: string;
  private static genAI: GoogleGenerativeAI;
  private static model: any;
  
  static initialize(apiKey: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  }
  
  static async analyzeImage(imagePath: string) {
    try {
      if (!this.model) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Gemini API key not found');
        this.initialize(apiKey);
      }
      
      // Read the image file
      const imageData = fs.readFileSync(imagePath);
      const mimeType = this.getMimeType(imagePath);
      
      // Prepare image for Gemini
      const image = {
        inlineData: {
          data: Buffer.from(imageData).toString('base64'),
          mimeType
        }
      };
      
      // Generate prompt for food analysis
      const prompt = `Analyze this image with a culinary focus. 
  
  If this is food:
  1. What dish is this?
  2. What are the main ingredients visible?
  3. What cuisine does this belong to?
  4. How is it typically prepared?
  5. Estimate nutrition (calories, protein, etc.)
  
  If this is NOT food, briefly state what it is, then suggest a food-related topic the user might be interested in discussing instead.
  
      Return your analysis in JSON format:
      {
        "isDish": true/false,
        "dishName": "name of dish if applicable",
        "description": "brief description of what's in the image",
        "ingredients": ["ingredient1", "ingredient2"...],
        "estimatedCalories": number,
        "tags": ["tag1", "tag2"...]
      }`;
      
      // Send request to Gemini
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }, image] }]
      });
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response
      try {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                          text.match(/{[\s\S]*}/);
        const jsonStr = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '') : text;
        const analysis = JSON.parse(jsonStr);
        
        return {
          tags: analysis.tags || [],
          description: analysis.description || "",
          confidence: 0.95,
          foodRecognition: {
            isDish: analysis.isDish || false,
            dishName: analysis.dishName || "Unknown",
            ingredients: analysis.ingredients || [],
            nutritionalInfo: {
              calories: analysis.estimatedCalories || 0,
              protein: 0,
              carbs: 0,
              fat: 0
            }
          }
        };
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        // Fallback to basic description
        return {
          tags: ["image"],
          description: text.substring(0, 100),
          confidence: 0.7,
          foodRecognition: {
            isDish: text.toLowerCase().includes("food") || text.toLowerCase().includes("dish"),
            dishName: "Unknown",
            ingredients: [],
            nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 }
          }
        };
      }
    } catch (error) {
      console.error('Error analyzing image with Gemini:', error);
      return {
        tags: ["image"],
        description: "Image analysis failed",
        confidence: 0,
        foodRecognition: {
          isDish: false,
          dishName: "Unknown",
          ingredients: [],
          nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 }
        }
      };
    }
  }
  
  private static getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      case '.webp':
        return 'image/webp';
      case '.avif':
        return 'image/avif';
      default:
        return 'application/octet-stream';
    }
  }
}