const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/conversations', requireAuth, messageController.getConversations);
router.post('/conversations', requireAuth, messageController.startConversation);
router.post('/requests/:conversationId/accept', requireAuth, messageController.acceptRequest);
router.delete('/requests/:conversationId', requireAuth, messageController.declineRequest);
router.get('/:conversationId', requireAuth, messageController.getChatHistory);
router.post('/:conversationId', requireAuth, upload.single('media'), messageController.sendMessage);
router.post('/:conversationId/read', requireAuth, messageController.markRead);

module.exports = router;
