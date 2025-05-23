import express from 'express';
import { verifyToken } from '../middleware/authMIddleware';
import { continueChat, createChat, deleteChat, getChatMessages, getChats, processChatMessage, renameChat } from '../controllers/AI-ChatBotController/chatController';
import { saveMessageFeedback, sendMessage } from '../controllers/AI-ChatBotController/messageController';
import { searchChats } from '../controllers/AI-ChatBotController/searchController';


const router = express.Router();

router.use(verifyToken);


router.post('/chats', createChat);
router.get('/chats', getChats);
router.get('/chats/:chatId/messages', getChatMessages);
router.post('/chats/:chatId/messages', sendMessage);
router.delete('/chats/:chatId', deleteChat);
router.put('/chats/:chatId/rename', renameChat);
router.post('/chats/:s/continue', continueChat);
router.post('/messages/:messageId/feedback', saveMessageFeedback);
router.get('/search', searchChats);

router.post('/chats/:chatId/messages', verifyToken, processChatMessage);


export { router as AIChatbotRouter };