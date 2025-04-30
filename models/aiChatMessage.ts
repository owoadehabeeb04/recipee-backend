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
  content: {
    type: String,
    required: true
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
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create models if they don't exist
export const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);