import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';

const router = Router();
const notificationService = new NotificationService();

// Device registration endpoint
router.post('/register-device', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, userId } = req.body;
    
    if (!token || !userId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    await notificationService.registerDevice(userId, token);
    res.json({ success: true });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Notifications endpoint
router.post('/notifications', async (req: Request, res: Response) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId || !message) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    await notificationService.sendNotification(userId, message);
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
