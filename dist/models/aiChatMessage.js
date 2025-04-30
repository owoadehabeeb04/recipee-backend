"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = exports.Chat = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Chat schema for conversation management
const ChatSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
const MessageSchema = new mongoose_1.default.Schema({
    chat: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
exports.Chat = mongoose_1.default.models.Chat || mongoose_1.default.model('Chat', ChatSchema);
exports.Message = mongoose_1.default.models.Message || mongoose_1.default.model('Message', MessageSchema);
