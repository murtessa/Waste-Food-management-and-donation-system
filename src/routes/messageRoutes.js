const express = require('express');
const messageController = require('./../controllers/messageController');
const authController = require('./../controllers/authController'); // Assuming you have an authController for authentication middleware

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.get('/messages', messageController.getMessages);
router.get('/messages/unread', messageController.getUnreadMessages);
router.post('/messages/mark-read', messageController.markMessagesAsRead);

module.exports = router;
