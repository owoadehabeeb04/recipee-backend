import express from 'express';
import { verifyToken } from '../middleware/authMIddleware';
import { continueChat, createChat, deleteChat, getChatMessages, getChats,  processChatMessageStream,  renameChat } from '../controllers/AI-ChatBotController/chatController';
import { saveMessageFeedback, sendMessage, testIntentDetection } from '../controllers/AI-ChatBotController/messageController';
import { searchChats } from '../controllers/AI-ChatBotController/searchController';
import { processChatMessage, processChatMessageGet } from '../controllers/AI-ChatBotController/langchainController';
import { processVoiceMessage, processVoiceMessageStream } from '../controllers/AI-ChatBotController/voiceController';
import { imageUpload } from '../middleware/imageMiddleware';
import { processImageMessage, processMultiImageMessage } from '../controllers/AI-ChatBotController/chatbotImages';
import { culinaryFocusMiddleware } from '../middleware/culinaryFoodFocus';


const router = express.Router();

router.use(verifyToken);

router.use(culinaryFocusMiddleware);

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
router.post('/chats/:chatId/message', processChatMessage);
router.get('/chats/:chatId/message', processChatMessageGet);
router.post('/chats/:chatId/stream', processChatMessageStream);
router.post('/chats/:chatId/voice', processVoiceMessage);
router.post('/chats/:chatId/voice-stream', processVoiceMessageStream);

router.post(
    '/chats/:chatId/image',
    verifyToken,
    imageUpload.single('image'),
    processImageMessage
  );
  
  router.post(
'/chats/:chatId/images',
    verifyToken,
    imageUpload.array('images', 5),
    processMultiImageMessage
  );


export { router as AIChatbotRouter };