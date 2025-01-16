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
        const conn = await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/messenger-chat');
        console.log('MongoDB Connected:', {
            host: conn.connection.host,
            name: conn.connection.name,
            collections: Object.keys(conn.connection.collections)
        });
        // Log when disconnected
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });
        // Log when reconnected
        mongoose_1.default.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });
        // Log all MongoDB operations in debug mode
        mongoose_1.default.set('debug', (collectionName, method, ...args) => {
            console.log(`MongoDB Debug - ${collectionName}.${method}`, args);
        });
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
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
