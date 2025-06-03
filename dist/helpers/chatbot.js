"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChatTitle = void 0;
const aiChatMessage_1 = require("../models/aiChatMessage");
const generateChatTitle = async (chatId) => {
    try {
        // Get the first few user messages to understand the conversation topic
        const messages = await aiChatMessage_1.Message.find({ chat: chatId })
            .sort({ createdAt: 1 })
            .limit(5);
        if (messages.length === 0) {
            return 'New culinary conversation';
        }
        // Extract user messages content
        const userMessages = messages
            .filter(msg => msg.role === 'user' || msg.sender === 'user')
            .map(msg => msg.content);
        if (userMessages.length === 0) {
            return 'New culinary conversation';
        }
        const firstUserMessage = userMessages[0].toLowerCase();
        // Check for recipe requests
        if (firstUserMessage.includes('recipe for') || firstUserMessage.includes('how to make')) {
            const recipeName = extractRecipeName(firstUserMessage);
            if (recipeName) {
                return `${capitalizeFirstLetter(recipeName)} recipe`;
            }
        }
        // Check for meal plan requests
        if (firstUserMessage.includes('meal plan') || firstUserMessage.includes('weekly menu')) {
            return 'Meal planning discussion';
        }
        // Check for cooking technique questions
        if (firstUserMessage.includes('how do i') || firstUserMessage.includes('what is the best way to')) {
            // Extract the cooking technique being asked about
            const technique = extractCookingTechnique(firstUserMessage);
            if (technique) {
                return `${capitalizeFirstLetter(technique)} tips & techniques`;
            }
        }
        // Check for ingredient questions
        if (firstUserMessage.includes('substitute for') ||
            firstUserMessage.includes('replacement for') ||
            firstUserMessage.includes('instead of')) {
            return 'Ingredient substitutions';
        }
        // Check for user profile/account questions
        if (firstUserMessage.includes('profile') || firstUserMessage.includes('account') ||
            firstUserMessage.includes('my information')) {
            return 'Account management';
        }
        // General recipe browsing
        if (firstUserMessage.includes('show me') || firstUserMessage.includes('find') ||
            firstUserMessage.includes('search for')) {
            return 'Recipe exploration';
        }
        // If we can't categorize it specifically, use a substring of the message
        if (firstUserMessage.length > 5) {
            // Clean up the message for a title
            let titleFromMessage = firstUserMessage
                .replace(/[?.,!]/g, '')
                .replace(/(\b(can|you|me|i|please|hello|hey|hi)\b)/gi, '')
                .trim();
            // Truncate if needed
            if (titleFromMessage.length > 30) {
                titleFromMessage = titleFromMessage.substring(0, 27) + '...';
            }
            if (titleFromMessage.length > 5) {
                return capitalizeFirstLetter(titleFromMessage);
            }
        }
        // Default to a generic but contextual title
        return 'Cooking conversation';
    }
    catch (error) {
        console.error('Error generating chat title:', error);
        return 'Culinary discussion';
    }
};
exports.generateChatTitle = generateChatTitle;
/**
 * Helper function to extract recipe name from a message
 */
function extractRecipeName(message) {
    // Handle "recipe for X" pattern
    let match = message.match(/recipe for ([\w\s]+)($|\?|\.)/i);
    if (match && match[1]) {
        return match[1].trim();
    }
    // Handle "how to make X" pattern
    match = message.match(/how to (make|cook|prepare) ([\w\s]+)($|\?|\.)/i);
    if (match && match[2]) {
        return match[2].trim();
    }
    // Handle "can you show me how to make X" pattern
    match = message.match(/show me how to (make|cook|prepare) ([\w\s]+)($|\?|\.)/i);
    if (match && match[2]) {
        return match[2].trim();
    }
    return '';
}
function extractCookingTechnique(message) {
    // Handle "how do I X" pattern
    let match = message.match(/how do i ([\w\s]+)($|\?|\.)/i);
    if (match && match[1]) {
        return match[1].trim();
    }
    // Handle "what is the best way to X" pattern
    match = message.match(/what is the best way to ([\w\s]+)($|\?|\.)/i);
    if (match && match[1]) {
        return match[1].trim();
    }
    return '';
}
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
