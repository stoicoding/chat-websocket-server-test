"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const NotificationService_1 = require("../services/NotificationService");
const router = (0, express_1.Router)();
const notificationService = new NotificationService_1.NotificationService();
// Device registration endpoint
router.post('/register-device', async (req, res) => {
    try {
        const { token, userId } = req.body;
        if (!token || !userId) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        await notificationService.registerDevice(userId, token);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error registering device:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Notifications endpoint
router.post('/notifications', async (req, res) => {
    try {
        const { userId, message } = req.body;
        if (!userId || !message) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        await notificationService.sendNotification(userId, message);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
