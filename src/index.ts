import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from './websocket';
import router from './routes';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const useMockResponses = process.env.USE_MOCK_RESPONSES === 'true';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use(router);

// Connect to MongoDB
mongoose.set('debug', true); // Enable mongoose debug mode

const connectDB = async () => {
  try {
    // Check if we're running on Railway
    const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
    
    // Construct MongoDB URI based on environment
    let mongoUri = process.env.MONGO_URL; // Try using direct URI first
    
    if (!mongoUri && isRailway) {
      // Construct URI from Railway's MongoDB variables
      const username = process.env.MONGOUSER;
      const password = process.env.MONGOPASSWORD;
      const host = process.env.MONGOHOST || 'monorail.proxy.rlwy.net';
      const port = process.env.MONGOPORT || '27017';
      const database = process.env.MONGO_DATABASE || 'messenger-chat';
      
      mongoUri = `mongodb://${username}:${password}@${host}:${port}/${database}`;
    } else {
      // Local development fallback
      mongoUri = mongoUri || 'mongodb://localhost:27017/messenger-chat';
    }

    if (!mongoUri) {
      throw new Error('Could not construct MongoDB URI. Please check environment variables.');
    }

    console.log('Attempting to connect to MongoDB...');
    console.log(`Environment: ${isRailway ? 'Railway' : 'Local'}`);
    
    // Connection options based on environment
    const connectionOptions = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      ...(isRailway ? {
        ssl: false,
        tls: false,
        directConnection: true,
        authSource: 'admin'
      } : {
        ssl: false,
        tls: false
      })
    };

    // Log connection attempt (hiding sensitive info)
    console.log('MongoDB connection options:', {
      ...connectionOptions,
      uri: mongoUri.replace(/\/\/[^@]+@/, '//****:****@')
    });

    const conn = await mongoose.connect(mongoUri, connectionOptions);

    console.log('MongoDB Connected Successfully:', {
      host: conn.connection.host,
      name: conn.connection.name,
      collections: Object.keys(conn.connection.collections)
    });

    // Connection event handlers
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected, attempting to reconnect...');
      setTimeout(connectDB, 5000);
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      setTimeout(connectDB, 5000);
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Log all relevant environment variables for debugging
    console.error('Environment variables:', {
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'NOT SET',
      MONGO_URL: process.env.MONGO_URL ? '[HIDDEN]' : 'NOT SET',
      MONGOUSER: process.env.MONGOUSER ? '[HIDDEN]' : 'NOT SET',
      MONGOPASSWORD: process.env.MONGOPASSWORD ? '[HIDDEN]' : 'NOT SET',
      MONGOHOST: process.env.MONGOHOST ? '[HIDDEN]' : 'NOT SET',
      MONGOPORT: process.env.MONGOPORT || 'NOT SET',
      MONGO_DATABASE: process.env.MONGO_DATABASE || 'NOT SET'
    });
    
    // Retry connection after delay
    setTimeout(connectDB, 5000);
  }
};

// Initial connection
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server with the HTTP server
export const wsServer = new WebSocketServer(server, useMockResponses);

// Start server with retry logic
async function startServer(retryPort: number = parseInt(port.toString())) {
  try {
    server.listen(retryPort, () => {
      logger.info(`Server running on port ${retryPort}`);
      logger.info(`WebSocket server attached to HTTP server`);
    });
  } catch (error) {
    logger.error(`Failed to start server on port ${retryPort}:`, error);
    if (retryPort < retryPort + 10) {
      logger.info(`Retrying with port ${retryPort + 1}...`);
      await startServer(retryPort + 1);
    } else {
      logger.error('Failed to start server after 10 retries');
      process.exit(1);
    }
  }
}

// Initialize server
startServer();
