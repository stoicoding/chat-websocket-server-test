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
const port = parseInt(process.env.PORT || '3000', 10);
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
// Initialize WebSocket server
exports.wsServer = new websocket_1.WebSocketServer(port, useMockResponses);
// Start HTTP server
const startServer = (retryPort = port) => {
    try {
        app.listen(retryPort, () => {
            console.log(`HTTP Server running on port ${retryPort}`);
            console.log(`WebSocket Server running on port ${retryPort}`);
            console.log('Mock responses are', useMockResponses ? 'enabled' : 'disabled');
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${retryPort} is busy, trying ${retryPort + 1}...`);
                startServer(retryPort + 1);
            }
            else {
                console.error('Server error:', err);
            }
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
    }
};
startServer();
