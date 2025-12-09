const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

router.get('/messages/:userId', auth, chatController.getMessages);
router.post('/mark-read', auth, chatController.markAsRead);
router.get('/list', auth, chatController.getChatList);

module.exports = router;
