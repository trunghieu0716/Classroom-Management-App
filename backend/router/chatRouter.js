const express = require('express');
const router = express.Router();
const {
    getChatHistory,
    sendMessage,
    markMessagesAsRead,
    getUserChatRooms,
    createTestData
} = require('../controller/chatController');

// GET /messages/:roomId - Get chat history for a room
router.get('/messages/:roomId', getChatHistory);

// POST /sendMessage - Send a message (also available via Socket.io)
router.post('/sendMessage', sendMessage);

// PUT /markAsRead/:roomId - Mark messages as read
router.put('/markAsRead/:roomId', markMessagesAsRead);

// GET /chatRooms/:userId - Get all chat rooms for a user
router.get('/chatRooms/:userId', getUserChatRooms);

// GET /createTestData - Create test data for chat testing
router.get('/createTestData', createTestData);

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Chat routes are working!' });
});

module.exports = router;