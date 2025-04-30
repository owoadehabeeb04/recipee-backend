"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpers = void 0;
exports.helpers = {
    isMealPlanningRequest(input) {
        const mealPlanKeywords = [
            'meal plan', 'weekly plan', 'diet plan', '7 day', 'seven day',
            'weekly menu', 'meal prep', 'meal schedule', 'eating plan',
            'menu plan', 'food plan', 'nutrition plan', 'diet schedule'
        ];
        const inputLower = input.toLowerCase();
        return mealPlanKeywords.some(keyword => inputLower.includes(keyword));
    },
    detectDateReference(text) {
        const datePatterns = [
            /next week/i,
            /this week/i,
            /starting (?:on|from)? (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
            /(?:january|february|march|april|may|june|july|august|september|october|november|december)/i,
            /\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/,
            /\d{4}-\d{1,2}-\d{1,2}/
        ];
        return datePatterns.some(pattern => pattern.test(text));
    },
    detectNutritionalGoal(text) {
        const nutritionPatterns = [
            /(?:high|low) (?:protein|carb|fat|calorie)/i,
            /(?:lose|gain) weight/i,
            /diet/i,
            /nutrition/i,
            /healthy/i,
            /balanced/i,
            /macro/i
        ];
        return nutritionPatterns.some(pattern => pattern.test(text));
    }
};
