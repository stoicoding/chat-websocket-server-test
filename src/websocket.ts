import WebSocket from 'ws';
import http from 'http';
import mongoose from 'mongoose';
import Message from './models/Message';
import Room from './models/Room';
import { logger } from './utils/logger';

interface BaseMessage {
  type: string;
  roomId: string;
}

interface ChatMessage extends BaseMessage {
  type: 'message';
  senderId: string;
  senderName: string;
  content: string;
  timestamp?: Date;
}

interface HistoryMessage extends BaseMessage {
  type: 'history';
  messages: any[];
}

type WSMessage = ChatMessage | HistoryMessage;

interface InitialMessage {
  userId: string;
  roomId: string;
}

interface Client {
  ws: WebSocket;
  userId: string;
  roomId: string;
}

export class WebSocketServer {
  private wss: WebSocket.Server;
  private clients: Map<string, Client> = new Map();
  private useMockResponses: boolean;
  private mockResponses: string[] = [
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

  constructor(server: http.Server, useMockResponses: boolean = false) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.useMockResponses = useMockResponses;
    logger.info('WebSocket Server initialized');
    logger.info(`Mock responses are ${useMockResponses ? 'enabled' : 'disabled'}`);
    this.initialize();
  }

  private initialize(): void {
    this.wss.on('connection', async (ws: WebSocket) => {
      const clientId = Math.random().toString(36).substring(7);
      
      // Wait for client to send their user ID and room ID
      ws.once('message', async (data: WebSocket.RawData) => {
        try {
          const initialMessage = JSON.parse(data.toString()) as InitialMessage;
          
          if (!initialMessage.userId || !initialMessage.roomId) {
            logger.error('Missing userId or roomId in initial message');
            ws.close();
            return;
          }

          // Create or update room
          let room = await Room.findOne({ roomId: initialMessage.roomId });
          if (!room) {
            room = new Room({
              roomId: initialMessage.roomId,
              name: `Room ${initialMessage.roomId}`,
              participants: [initialMessage.userId]
            });
          } else if (!room.participants.includes(initialMessage.userId)) {
            room.participants.push(initialMessage.userId);
          }
          await room.save();

          this.clients.set(clientId, { 
            ws, 
            userId: initialMessage.userId,
            roomId: initialMessage.roomId 
          });
          logger.info(`Client connected: ${clientId} (User: ${initialMessage.userId}) in room: ${initialMessage.roomId}`);

          logger.info(`Fetching chat history for room: ${initialMessage.roomId}`);
          
          // Log MongoDB connection status
          logger.info('MongoDB connection state:', mongoose.connection.readyState);
          
          // Send chat history for this room
          const history = await Message.find({ 
            roomId: initialMessage.roomId 
          }).sort({ timestamp: -1 }).limit(50);
          
          logger.info('History query result:', {
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
          logger.info('Chat history sent to client');

          // Handle subsequent messages
          ws.on('message', async (messageData: WebSocket.RawData) => {
            try {
              const message = JSON.parse(messageData.toString()) as WSMessage;
              
              if (!this.isValidChatMessage(message)) {
                logger.error('Invalid message format:', message);
                return;
              }

              logger.info('Saving new message:', {
                roomId: initialMessage.roomId,
                senderId: message.senderId,
                content: message.content
              });
              
              const newMessage = new Message({
                roomId: initialMessage.roomId,
                senderId: message.senderId,
                senderName: message.senderName,
                content: message.content,
                timestamp: new Date()
              });
              await newMessage.save();
              logger.info('Message saved successfully with ID:', newMessage._id);

              // Broadcast to all clients in the same room
              this.clients.forEach((client) => {
                if (client.ws.readyState === WebSocket.OPEN && client.roomId === initialMessage.roomId) {
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
            } catch (error) {
              logger.warn('Error processing message:', error);
            }
          });

          // Handle client disconnection
          ws.on('close', () => {
            this.clients.delete(clientId);
            logger.info(`Client disconnected: ${clientId}`);
          });

        } catch (error) {
          logger.error('Error processing initial message:', error);
          ws.close();
        }
      });
    });
  }

  private getRandomResponse(): string {
    const response = this.mockResponses[Math.floor(Math.random() * this.mockResponses.length)];
    return response !== undefined ? response : "default response";
  }

  private getRandomNumberOfResponses(): number {
    // 50% chance to send multiple responses
    const shouldSendMultiple = Math.random() < 0.5;
    if (shouldSendMultiple) {
      // Randomly choose between 2 or 3 responses
      return Math.random() < 0.5 ? 2 : 3;
    }
    return 1;
  }

  private async sendMockResponses(roomId: string): Promise<void> {
    const numberOfResponses = this.getRandomNumberOfResponses();
    
    for (let i = 0; i < numberOfResponses; i++) {
      // Add a small delay between messages
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const mockResponse = new Message({
        roomId: roomId,
        senderId: 'bot',
        senderName: 'ChatBot',
        content: this.getRandomResponse(),
        timestamp: new Date()
      });
      await mockResponse.save();

      // Broadcast bot response to all clients in the room
      this.clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN && client.roomId === roomId) {
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

  private isValidChatMessage(message: unknown): message is ChatMessage {
    if (!message || typeof message !== 'object') return false;
    
    const msg = message as { [key: string]: unknown };
    
    if (
      !msg.type ||
      msg.type !== 'message' ||
      !msg.roomId ||
      !msg.senderId ||
      !msg.senderName ||
      !msg.content ||
      typeof msg.roomId !== 'string' ||
      typeof msg.senderId !== 'string' ||
      typeof msg.senderName !== 'string' ||
      typeof msg.content !== 'string'
    ) {
      logger.error('Invalid message format:', {
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
