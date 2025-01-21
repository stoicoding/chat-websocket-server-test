// Example WebSocket client connection
const connectWebSocket = (userId: string, roomId: string) => {
  // For local development
  const wsUrl = 'ws://localhost:3000/ws';
  // For production
  // const wsUrl = 'wss://chat-websocket-server-test-production.up.railway.app/ws';
  
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('Connected to WebSocket server');
    
    // Send initial connection message
    const initialMessage = {
      userId: userId,
      roomId: roomId
    };
    ws.send(JSON.stringify(initialMessage));
  };

  // Handle incoming messages
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
      case 'history':
        console.log('Received chat history:', message.messages);
        break;
      case 'message':
        console.log('Received new message:', {
          sender: message.senderName,
          content: message.content,
          timestamp: message.timestamp
        });
        break;
    }
  };

  // Send a chat message
  const sendMessage = (content: string) => {
    const message = {
      type: 'message',
      roomId: roomId,
      senderId: userId,
      senderName: 'User Name',
      content: content
    };
    ws.send(JSON.stringify(message));
  };

  // Handle connection close
  ws.onclose = () => {
    console.log('Disconnected from WebSocket server');
  };

  // Handle errors
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return {
    ws,
    sendMessage
  };
};

// Example usage:
// const { ws, sendMessage } = connectWebSocket('user123', 'room456');
// sendMessage('Hello, everyone!');
