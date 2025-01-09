# WebSocket Server Test Project

A WebSocket server implementation with Express and TypeScript.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- TypeScript

## Installation

1. Clone the repository:
```bash
git clone git@github.com:stoicoding/chat-websocket-server-test.git
cd yo-websocket-server-test
```

2. Install dependencies:
```bash
npm install
```

3. Start with Mock (should add this flag into the command `USE_MOCK_RESPONSES=true`)
```bash
USE_MOCK_RESPONSES=true npm start
```

## Available Scripts

- `npm start`: Run the production server
- `npm run dev`: Run the development server with hot-reload
- `npm run build`: Build the TypeScript code
- `npm run watch-ts`: Watch TypeScript files and compile on changes

## Development

To start the development server with hot-reload:
```bash
npm run dev
```

## Production

To build and run for production:
```bash
npm run build
npm start
```

## Using Mock Mode

To use the server in mock mode:

1. Set the mock environment variable in your `.env` file:
```env
MOCK_MODE=true
```

2. Start the server as usual with either:
```bash
npm run dev   # for development
# or
npm start     # for production
```

When in mock mode, the server will:
- Use mock data instead of real database connections
- Simulate WebSocket responses
- Not require external service dependencies

## Project Structure

```
yo-websocket-server-test/
├── src/                    # Source files
│   ├── index.ts           # Application entry point
│   └── websocket.ts       # WebSocket server implementation
├── dist/                   # Compiled JavaScript files
├── package.json           # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── .env                  # Environment variables
```

## WebSocket Endpoints

The WebSocket server is available at:
```
ws://localhost:3000/ws
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details
