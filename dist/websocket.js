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
class WebSocketServer {
    constructor(port, useMockResponses = false) {
        this.clients = new Map();
        this.mockResponses = [
            "That's interesting! Tell me more.",
            "I completely understand what you mean.",
            "Thanks for sharing that!",
            "How fascinating! I've never thought about it that way.",
            "That's a great point!",
            "I see what you mean.",
            "Let's discuss this further!",
            "That's really cool!",
            "I appreciate your perspective on this.",
            "Interesting thought!"
        ];
        this.wss = new ws_1.default.Server({ port });
        this.useMockResponses = useMockResponses;
        console.log(`WebSocket Server initialized on port ${port}`);
        console.log(`Mock responses are ${useMockResponses ? 'enabled' : 'disabled'}`);
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
                        console.log('Missing userId or roomId in initial message');
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
                    console.log(`Client connected: ${clientId} (User: ${initialMessage.userId}) in room: ${initialMessage.roomId}`);
                    console.log(`Fetching chat history for room: ${initialMessage.roomId}`);
                    // Log MongoDB connection status
                    console.log('MongoDB connection state:', mongoose_1.default.connection.readyState);
                    // Send chat history for this room
                    const history = await Message_1.default.find({
                        roomId: initialMessage.roomId
                    }).sort({ timestamp: -1 }).limit(50);
                    console.log('History query result:', {
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
                    console.log('Chat history sent to client');
                    // Handle subsequent messages
                    ws.on('message', async (messageData) => {
                        try {
                            const message = JSON.parse(messageData.toString());
                            if (!this.isValidChatMessage(message)) {
                                console.error('Invalid message format:', message);
                                return;
                            }
                            console.log('Saving new message:', {
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
                            console.log('Message saved successfully with ID:', newMessage._id);
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
                            console.warn('Error processing message:', error);
                        }
                    });
                    // Handle client disconnection
                    ws.on('close', () => {
                        this.clients.delete(clientId);
                        console.log(`Client disconnected: ${clientId}`);
                    });
                }
                catch (error) {
                    console.error('Error processing initial message:', error);
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
            console.error('Invalid message format:', {
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
