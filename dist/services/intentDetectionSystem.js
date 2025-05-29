"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentDetector = void 0;
class IntentDetector {
    static detectIntent(message) {
        console.log('IntentDetector: Processing message:', message);
        if (!message || typeof message !== 'string') {
            return {
                mode: 'general_cooking',
                confidence: 0.1
            };
        }
        const lowerMessage = message.toLowerCase();
        console.log('IntentDetector: Lowercase message:', lowerMessage);
        // Check for database interactions
        if (this.isDatabaseQuery(lowerMessage)) {
            console.log('IntentDetector: Detected as database query');
            return {
                mode: 'database',
                action: this.extractAction(lowerMessage),
                entity: this.extractEntity(lowerMessage),
                confidence: 0.9
            };
        }
        // Check for smart requests
        if (this.isSmartRequest(lowerMessage)) {
            console.log('IntentDetector: Detected as smart request');
            return {
                mode: 'smart_request',
                action: this.extractAction(lowerMessage),
                entity: this.extractEntity(lowerMessage),
                confidence: 0.8,
                requiredParams: this.getRequiredParams(lowerMessage)
            };
        }
        // Default to general cooking
        console.log('IntentDetector: Defaulting to general cooking');
        return {
            mode: 'general_cooking',
            confidence: 0.7
        };
    }
    static isDatabaseQuery(message) {
        const hasPersonal = this.DATABASE_KEYWORDS.personal.some(keyword => message.includes(keyword));
        const hasEntity = this.DATABASE_KEYWORDS.entities.some(entity => message.includes(entity));
        console.log('IntentDetector: Database check - hasPersonal:', hasPersonal, 'hasEntity:', hasEntity);
        return hasPersonal && hasEntity;
    }
    static isSmartRequest(message) {
        const hasAction = this.SMART_REQUEST_KEYWORDS.actions.some(action => message.includes(action));
        const hasEntity = this.SMART_REQUEST_KEYWORDS.entities.some(entity => message.includes(entity));
        console.log('IntentDetector: Smart request check - hasAction:', hasAction, 'hasEntity:', hasEntity);
        return hasAction || (hasEntity && message.includes('new'));
    }
    static extractAction(message) {
        const allActions = [
            ...this.DATABASE_KEYWORDS.actions,
            ...this.SMART_REQUEST_KEYWORDS.actions
        ];
        return allActions.find(action => message.includes(action));
    }
    static extractEntity(message) {
        const allEntities = [
            ...this.DATABASE_KEYWORDS.entities,
            ...this.SMART_REQUEST_KEYWORDS.entities
        ];
        return allEntities.find(entity => message.includes(entity));
    }
    static getRequiredParams(message) {
        if (message.includes('password')) {
            return ['currentPassword', 'newPassword', 'confirmPassword'];
        }
        if (message.includes('meal plan')) {
            return ['startDate', 'duration', 'preferences'];
        }
        return [];
    }
}
exports.IntentDetector = IntentDetector;
// Database interaction keywords
IntentDetector.DATABASE_KEYWORDS = {
    personal: ['my', 'mine', 'i have', 'show me'],
    entities: ['recipes', 'meal plan', 'favorites', 'shopping list', 'profile'],
    actions: ['show', 'get', 'find', 'list', 'display']
};
// Smart request keywords  
IntentDetector.SMART_REQUEST_KEYWORDS = {
    actions: ['create', 'add', 'save', 'change', 'update', 'delete', 'remove', 'modify'],
    entities: ['recipe', 'meal plan', 'password', 'profile', 'favorite']
};
// General cooking keywords
IntentDetector.GENERAL_KEYWORDS = [
    'how to', 'what is', 'tell me about', 'explain', 'recipe for', 'cook', 'prepare'
];
