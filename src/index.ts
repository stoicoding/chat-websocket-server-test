import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import { WebSocketServer } from './websocket';
import { NotificationService } from './services/NotificationService';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const wsPort = parseInt(process.env.WS_PORT || '8080');
const useMockResponses = process.env.USE_MOCK_RESPONSES === 'true';

// Middleware
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.set('debug', true); // Enable mongoose debug mode

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/messenger-chat');
    console.log('MongoDB Connected:', {
      host: conn.connection.host,
      name: conn.connection.name,
      collections: Object.keys(conn.connection.collections)
    });

    // Log when disconnected
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Log when reconnected
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    // Log all MongoDB operations in debug mode
    mongoose.set('debug', (collectionName: string, method: string, ...args: any[]) => {
      console.log(`MongoDB Debug - ${collectionName}.${method}`, args);
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Initial connection
connectDB();

const notificationService = new NotificationService();

// Device registration endpoint
app.post('/register-device', async (req: Request, res: Response): Promise<void> => {
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

// Initialize WebSocket server
export const wsServer = new WebSocketServer(wsPort, useMockResponses);

// Start HTTP server
app.listen(port, () => {
  console.log(`HTTP Server running on port ${port}`);
  console.log(`WebSocket Server running on port ${wsPort}`);
});
