"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const ws_1 = __importDefault(require("ws"));
const mongoose_1 = __importDefault(require("mongoose"));
const Message_1 = __importDefault(require("./models/Message"));
const Room_1 = __importDefault(require("./models/Room"));
const logger_1 = require("./utils/logger");
class WebSocketServer {
    constructor(server, useMockResponses = false) {
        this.clients = new Map();
        this.mockResponses = [
            "なるほど、興味深いですね。もっと詳しく教えてください。",
            "おっしゃる意味がよくわかります。",
            "それを共有してくださってありがとうございます！",
            "面白いですね！そういう見方をしたことがありませんでした。",
            "素晴らしい指摘です！",
            "なるほど、理解しました。",
            "それについてもっと議論しましょう！",
            "すごいですね！",
            "そのような視点を持っていただき、感謝します。",
            "興味深い考えですね！"
        ];
        this.wss = new ws_1.default.Server({ server, path: '/ws' });
        this.useMockResponses = useMockResponses;
        logger_1.logger.info('WebSocket Server initialized');
        logger_1.logger.info(`Mock responses are ${useMockResponses ? 'enabled' : 'disabled'}`);
        this.initialize();
    }
    initialize() {
        this.wss.on('connection', async (ws) => {
            const clientId = Math.random().toString(36).substring(7);
            // Wait for client to send their user ID and room ID
            ws.once('message', async (data) => {
                try {
                    const initialMessage = JSON.parse(data.toString());
                    if (!initialMessage.userId || !initialMessage.roomId) {
                        logger_1.logger.error('Missing userId or roomId in initial message');
                        ws.close();
                        return;
                    }
                    // Create or update room
                    let room = await Room_1.default.findOne({ roomId: initialMessage.roomId });
                    if (!room) {
                        room = new Room_1.default({
                            roomId: initialMessage.roomId,
                            name: `Room ${initialMessage.roomId}`,
                            participants: [initialMessage.userId]
                        });
                    }
                    else if (!room.participants.includes(initialMessage.userId)) {
                        room.participants.push(initialMessage.userId);
                    }
                    await room.save();
                    this.clients.set(clientId, {
                        ws,
                        userId: initialMessage.userId,
                        roomId: initialMessage.roomId
                    });
                    logger_1.logger.info(`Client connected: ${clientId} (User: ${initialMessage.userId}) in room: ${initialMessage.roomId}`);
                    logger_1.logger.info(`Fetching chat history for room: ${initialMessage.roomId}`);
                    // Log MongoDB connection status
                    logger_1.logger.info('MongoDB connection state:', mongoose_1.default.connection.readyState);
                    // Send chat history for this room
                    const history = await Message_1.default.find({
                        roomId: initialMessage.roomId
                    }).sort({ timestamp: -1 }).limit(50);
                    logger_1.logger.info('History query result:', {
                        count: history.length,
                        roomId: initialMessage.roomId,
                        messages: history.map(msg => ({
                            id: msg._id,
                            roomId: msg.roomId,
                            senderId: msg.senderId,
                            content: msg.content,
                            timestamp: msg.timestamp
                        }))
                    });
                    ws.send(JSON.stringify({
                        type: 'history',
                        messages: history
                    }));
                    logger_1.logger.info('Chat history sent to client');
                    // Handle subsequent messages
                    ws.on('message', async (messageData) => {
                        try {
                            const message = JSON.parse(messageData.toString());
                            if (!this.isValidChatMessage(message)) {
                                logger_1.logger.error('Invalid message format:', message);
                                return;
                            }
                            logger_1.logger.info('Saving new message:', {
                                roomId: initialMessage.roomId,
                                senderId: message.senderId,
                                content: message.content
                            });
                            const newMessage = new Message_1.default({
                                roomId: initialMessage.roomId,
                                senderId: message.senderId,
                                senderName: message.senderName,
                                content: message.content,
                                timestamp: new Date()
                            });
                            await newMessage.save();
                            logger_1.logger.info('Message saved successfully with ID:', newMessage._id);
                            // Broadcast to all clients in the same room
                            this.clients.forEach((client) => {
                                if (client.ws.readyState === ws_1.default.OPEN && client.roomId === initialMessage.roomId) {
                                    client.ws.send(JSON.stringify({
                                        type: 'message',
                                        roomId: initialMessage.roomId,
                                        senderId: newMessage.senderId,
                                        senderName: newMessage.senderName,
                                        content: newMessage.content,
                                        timestamp: newMessage.timestamp
                                    }));
                                }
                            });
                            if (this.useMockResponses) {
                                await this.sendMockResponses(initialMessage.roomId);
                            }
                        }
                        catch (error) {
                            logger_1.logger.warn('Error processing message:', error);
                        }
                    });
                    // Handle client disconnection
                    ws.on('close', () => {
                        this.clients.delete(clientId);
                        logger_1.logger.info(`Client disconnected: ${clientId}`);
                    });
                }
                catch (error) {
                    logger_1.logger.error('Error processing initial message:', error);
                    ws.close();
                }
            });
        });
    }
    getRandomResponse() {
        const response = this.mockResponses[Math.floor(Math.random() * this.mockResponses.length)];
        return response !== undefined ? response : "default response";
    }
    getRandomNumberOfResponses() {
        // 50% chance to send multiple responses
        const shouldSendMultiple = Math.random() < 0.5;
        if (shouldSendMultiple) {
            // Randomly choose between 2 or 3 responses
            return Math.random() < 0.5 ? 2 : 3;
        }
        return 1;
    }
    async sendMockResponses(roomId) {
        const numberOfResponses = this.getRandomNumberOfResponses();
        for (let i = 0; i < numberOfResponses; i++) {
            // Add a small delay between messages
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            const mockResponse = new Message_1.default({
                roomId: roomId,
                senderId: 'bot',
                senderName: 'ChatBot',
                content: this.getRandomResponse(),
                timestamp: new Date()
            });
            await mockResponse.save();
            // Broadcast bot response to all clients in the room
            this.clients.forEach((client) => {
                if (client.ws.readyState === ws_1.default.OPEN && client.roomId === roomId) {
                    client.ws.send(JSON.stringify({
                        type: 'message',
                        roomId: roomId,
                        senderId: mockResponse.senderId,
                        senderName: mockResponse.senderName,
                        content: mockResponse.content,
                        timestamp: mockResponse.timestamp
                    }));
                }
            });
        }
    }
    isValidChatMessage(message) {
        if (!message || typeof message !== 'object')
            return false;
        const msg = message;
        if (!msg.type ||
            msg.type !== 'message' ||
            !msg.roomId ||
            !msg.senderId ||
            !msg.senderName ||
            !msg.content ||
            typeof msg.roomId !== 'string' ||
            typeof msg.senderId !== 'string' ||
            typeof msg.senderName !== 'string' ||
            typeof msg.content !== 'string') {
            logger_1.logger.error('Invalid message format:', {
                type: msg.type,
                roomId: msg.roomId,
                senderId: msg.senderId,
                senderName: msg.senderName,
                content: msg.content
            });
            return false;
        }
        return true;
    }
}
exports.WebSocketServer = WebSocketServer;
