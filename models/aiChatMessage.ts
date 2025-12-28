import mongoose from 'mongoose';

// Chat schema for conversation management
const ChatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userDetails: {
    name: { type: String },
    email: { type: String },
    role: { type: String },
  },
  title: {
    type: String,
    required: true
  },
  lastMessage: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Message schema for individual messages in a chat
const MessageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  isStreaming: {
    type: Boolean,
    default: false
  },
  content: {
    type: String,
    required: function(this: any) {
      return !this.isStreaming;
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    analysis: {
      tags: [String],
      description: String,
      confidence: Number,
      foodRecognition: {
        isDish: Boolean,
        dishName: String,
        ingredients: [String],
        nutritionalInfo: {
          calories: Number,
          protein: Number,
          carbs: Number,
          fat: Number
        }
      }
    }
  }],
  hasImages: {
    type: Boolean,
    default: true // Add default value
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  feedback: {
    type: String,
    enum: ['positive', 'negative', null],
    default: null
  }
}, { 
  timestamps: true,
  // Add toJSON transform to properly handle hasImages
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Always make hasImages match the images array status
      ret.hasImages = Array.isArray(ret.images) && ret.images.length > 0;
      
      // Ensure images is always an array
      if (!ret.images) ret.images = [] as any;
      
      return ret;
    }
  }
});

// Add pre-save middleware to automatically set hasImages
MessageSchema.pre('save', function(next) {
  // Set hasImages based on whether the images array exists and has items
  if (this.images && this.images.length > 0) {
    this.hasImages = true;
  } else {
    this.hasImages = false;
  }
  next();
});


// Create models if they don't exist
export const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);