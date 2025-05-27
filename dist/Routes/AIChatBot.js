"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIChatbotRouter = void 0;
const express_1 = __importDefault(require("express"));
const authMIddleware_1 = require("../middleware/authMIddleware");
const chatController_1 = require("../controllers/AI-ChatBotController/chatController");
const messageController_1 = require("../controllers/AI-ChatBotController/messageController");
const searchController_1 = require("../controllers/AI-ChatBotController/searchController");
const langchainController_1 = require("../controllers/AI-ChatBotController/langchainController");
const router = express_1.default.Router();
exports.AIChatbotRouter = router;
router.use(authMIddleware_1.verifyToken);
router.post('/chats', chatController_1.createChat);
router.get('/chats', chatController_1.getChats);
router.get('/chats/:chatId/messages', chatController_1.getChatMessages);
router.post('/chats/:chatId/messages', messageController_1.sendMessage);
router.delete('/chats/:chatId', chatController_1.deleteChat);
router.put('/chats/:chatId/rename', chatController_1.renameChat);
router.post('/chats/:s/continue', chatController_1.continueChat);
router.post('/messages/:messageId/feedback', messageController_1.saveMessageFeedback);
router.get('/search', searchController_1.searchChats);
router.post('/chats/:chatId/messages', authMIddleware_1.verifyToken, langchainController_1.processChatMessage);
// POST endpoint (primary method)
router.post('/chats/:chatId/message', langchainController_1.processChatMessage);
// GET endpoint (convenience method)
router.get('/chats/:chatId/message', langchainController_1.processChatMessageGet);
// Streaming endpoint
router.post('/chats/:chatId/stream', chatController_1.processChatMessageStream);
