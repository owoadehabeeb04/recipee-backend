export interface IntentResult {
    mode: 'database' | 'smart_request' | 'general_cooking';
    action?: string;
    entity?: string;
    confidence: number;
    requiredParams?: string[];
  }
  
  export class IntentDetector {
    
    // Database interaction keywords
    private static DATABASE_KEYWORDS = {
      personal: ['my', 'mine', 'i have', 'show me'],
      entities: ['recipes', 'meal plan', 'favorites', 'shopping list', 'profile'],
      actions: ['show', 'get', 'find', 'list', 'display']
    };
    
    // Smart request keywords  
    private static SMART_REQUEST_KEYWORDS = {
      actions: ['create', 'add', 'save', 'change', 'update', 'delete', 'remove', 'modify'],
      entities: ['recipe', 'meal plan', 'password', 'profile', 'favorite']
    };
    
    // General cooking keywords
    private static GENERAL_KEYWORDS = [
      'how to', 'what is', 'tell me about', 'explain', 'recipe for', 'cook', 'prepare'
    ];
  
    static detectIntent(message: string): IntentResult {
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
    
    private static isDatabaseQuery(message: string): boolean {
      const hasPersonal = this.DATABASE_KEYWORDS.personal.some(keyword => 
        message.includes(keyword)
      );
      const hasEntity = this.DATABASE_KEYWORDS.entities.some(entity => 
        message.includes(entity)
      );
      
      console.log('IntentDetector: Database check - hasPersonal:', hasPersonal, 'hasEntity:', hasEntity);
      return hasPersonal && hasEntity;
    }
    
    private static isSmartRequest(message: string): boolean {
      const hasAction = this.SMART_REQUEST_KEYWORDS.actions.some(action => 
        message.includes(action)
      );
      const hasEntity = this.SMART_REQUEST_KEYWORDS.entities.some(entity => 
        message.includes(entity)
      );
      
      console.log('IntentDetector: Smart request check - hasAction:', hasAction, 'hasEntity:', hasEntity);
      return hasAction || (hasEntity && message.includes('new'));
    }
    
    private static extractAction(message: string): string | undefined {
      const allActions = [
        ...this.DATABASE_KEYWORDS.actions,
        ...this.SMART_REQUEST_KEYWORDS.actions
      ];
      
      return allActions.find(action => message.includes(action));
    }
    
    private static extractEntity(message: string): string | undefined {
      const allEntities = [
        ...this.DATABASE_KEYWORDS.entities,
        ...this.SMART_REQUEST_KEYWORDS.entities
      ];
      
      return allEntities.find(entity => message.includes(entity));
    }
    
    private static getRequiredParams(message: string): string[] {
      if (message.includes('password')) {
        return ['currentPassword', 'newPassword', 'confirmPassword'];
      }
      if (message.includes('meal plan')) {
        return ['startDate', 'duration', 'preferences'];
      }
      return [];
    }
  }