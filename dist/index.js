"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsServer = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const body_parser_1 = __importDefault(require("body-parser"));
const websocket_1 = require("./websocket");
const NotificationService_1 = require("./services/NotificationService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const wsPort = parseInt(process.env.WS_PORT || '8080');
const useMockResponses = process.env.USE_MOCK_RESPONSES === 'true';
// Middleware
app.use(body_parser_1.default.json());
// Connect to MongoDB
mongoose_1.default.set('debug', true); // Enable mongoose debug mode
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
        }
        else {
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
                ssl: true,
                tls: true,
                tlsAllowInvalidCertificates: true
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
        const conn = await mongoose_1.default.connect(mongoUri, connectionOptions);
        console.log('MongoDB Connected Successfully:', {
            host: conn.connection.host,
            name: conn.connection.name,
            collections: Object.keys(conn.connection.collections)
        });
        // Connection event handlers
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('MongoDB disconnected, attempting to reconnect...');
            setTimeout(connectDB, 5000);
        });
        mongoose_1.default.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            setTimeout(connectDB, 5000);
        });
    }
    catch (error) {
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
const notificationService = new NotificationService_1.NotificationService();
// Device registration endpoint
app.post('/register-device', async (req, res) => {
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
// Initialize WebSocket server with retry logic
const startWebSocketServer = (retryPort = wsPort) => {
    try {
        const ws = new websocket_1.WebSocketServer(retryPort, useMockResponses);
        console.log(`WebSocket Server running on port ${retryPort}`);
        return ws;
    }
    catch (error) {
        if (error.code === 'EADDRINUSE') {
            console.log(`WebSocket port ${retryPort} is busy, trying ${retryPort + 1}...`);
            return startWebSocketServer(retryPort + 1);
        }
        throw error;
    }
};
// Start HTTP server with retry logic
const startHTTPServer = (retryPort = parseInt(port.toString())) => {
    try {
        app.listen(retryPort, () => {
            console.log(`HTTP Server running on port ${retryPort}`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`HTTP port ${retryPort} is busy, trying ${retryPort + 1}...`);
                startHTTPServer(retryPort + 1);
            }
            else {
                console.error('HTTP Server error:', err);
            }
        });
    }
    catch (error) {
        console.error('Failed to start HTTP server:', error);
    }
};
// Initialize servers
exports.wsServer = startWebSocketServer();
startHTTPServer();
