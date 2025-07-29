const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
require('dotenv').config();

const redisManager = require('./config/redis');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ["http://localhost:3000"],
  credentials: true
}));
app.use(express.json());

// Store active connections
const activeConnections = new Map();

// Initialize Redis connection
async function initializeRedis() {
  try {
    await redisManager.connect();
    
    // Subscribe to Redis channels for cross-server communication
    await redisManager.subscribe('document:changes', (message) => {
      console.log('📥 Received document change from Redis:', {
        documentId: message.documentId,
        userId: message.userId,
        contentLength: message.content?.length
      });

      // Broadcast document changes to all connected clients except the sender
      const sockets = io.sockets.adapter.rooms.get(`doc:${message.documentId}`);
      if (sockets) {
        console.log(`📡 Broadcasting to ${sockets.size} sockets in room doc:${message.documentId}`);
        
        let sentCount = 0;
        sockets.forEach(socketId => {
          const connection = activeConnections.get(socketId);
          // Only send to users who didn't make the change
          if (connection && connection.userId !== message.userId) {
            console.log(`📤 Sending to socket ${socketId} (user: ${connection.userId})`);
            io.to(socketId).emit('document:change', message);
            sentCount++;
          } else {
            console.log(`⏭️ Skipping socket ${socketId} (same user or no connection)`);
          }
        });
        
        console.log(`✅ Sent document change to ${sentCount} clients`);
      } else {
        console.log(`❌ No sockets found in room doc:${message.documentId}`);
      }
    });

    await redisManager.subscribe('cursor:updates', (message) => {
      // Broadcast cursor updates to all clients in the room
      io.to(`doc:${message.documentId}`).emit('cursor:update', message);
    });

    await redisManager.subscribe('user:presence', (message) => {
      // Broadcast user presence updates
      io.to(`doc:${message.documentId}`).emit('user:presence', message);
    });

    await redisManager.subscribe('chat:messages', (message) => {
      // Broadcast chat messages
      io.to(`doc:${message.documentId}`).emit('chat:message', message);
    });

  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    process.exit(1);
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join document room
  socket.on('join:document', async (data) => {
    try {
      const { documentId, user } = data;
      
      // Generate user ID if not provided
      const userId = user.id || uuidv4();
      const userInfo = {
        id: userId,
        name: user.name || `User ${userId.slice(0, 8)}`,
        color: user.color || generateUserColor(),
        cursor: { line: 0, column: 0 }
      };

      // Store connection info
      activeConnections.set(socket.id, {
        userId,
        documentId,
        userInfo
      });

      // Join socket room
      socket.join(`doc:${documentId}`);

      // Add user to Redis room
      await redisManager.addUserToRoom(documentId, userId, userInfo);

      // Get current document
      let document = await redisManager.getDocument(documentId);
      if (!document) {
        // Create new document if it doesn't exist
        document = await redisManager.saveDocument(documentId, '// Welcome to CodeSync!\n// Start typing to collaborate in real-time\n\nconsole.log("Hello, collaborative world!");\nconsole.log("This is a real-time collaborative code editor powered by Redis!");\n\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\n// Test the function\nconsole.log("Fibonacci sequence:");\nfor (let i = 0; i < 8; i++) {\n  console.log(`F(${i}) = ${fibonacci(i)}`);\n}');
      }

      // Get all users in the room
      const roomUsers = await redisManager.getRoomUsers(documentId);

      // Send initial data to the user
      socket.emit('document:loaded', {
        document,
        users: roomUsers,
        userId
      });

      // Notify others about new user
      await redisManager.publish('user:presence', {
        type: 'user:joined',
        documentId,
        user: userInfo
      });

      console.log(`User ${userInfo.name} joined document ${documentId}`);

    } catch (error) {
      console.error('Error joining document:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  });

  // Handle document changes
  socket.on('document:change', async (data) => {
    try {
      const connection = activeConnections.get(socket.id);
      if (!connection) {
        console.log('❌ No connection found for socket:', socket.id);
        return;
      }

      const { documentId, userId } = connection;
      const { content, operation } = data;

      console.log('📝 Processing document change:', {
        socketId: socket.id,
        userId,
        documentId,
        contentLength: content?.length,
        operationType: operation?.type
      });

      // Get current document to check if content actually changed
      const currentDoc = await redisManager.getDocument(documentId);
      if (currentDoc && currentDoc.content === content) {
        console.log('⏭️ Skipping document save - content unchanged');
        return;
      }

      // Save document to Redis
      await redisManager.saveDocument(documentId, content);

      // Add operation to stream for history
      if (operation) {
        await redisManager.addOperation(documentId, {
          ...operation,
          userId,
          timestamp: Date.now()
        });
      }

      // Publish change to Redis for other servers
      const changeMessage = {
        documentId,
        content,
        operation,
        userId,
        timestamp: Date.now()
      };

      console.log('📤 Publishing document change to Redis:', {
        documentId,
        userId,
        contentLength: content?.length,
        timestamp: changeMessage.timestamp
      });

      await redisManager.publish('document:changes', changeMessage);

    } catch (error) {
      console.error('Error handling document change:', error);
    }
  });

  // Handle cursor updates
  socket.on('cursor:update', async (data) => {
    try {
      const connection = activeConnections.get(socket.id);
      if (!connection) return;

      const { documentId, userId } = connection;
      const { position, selection } = data;

      // Update user cursor in Redis
      const userInfo = { ...connection.userInfo, cursor: position, selection };
      await redisManager.addUserToRoom(documentId, userId, userInfo);

      // Publish cursor update
      await redisManager.publish('cursor:updates', {
        documentId,
        userId,
        position,
        selection,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error handling cursor update:', error);
    }
  });

  // Handle chat messages
  socket.on('chat:send', async (data) => {
    try {
      const connection = activeConnections.get(socket.id);
      if (!connection) return;

      const { documentId, userId, userInfo } = connection;
      const { message } = data;

      const chatMessage = {
        id: uuidv4(),
        documentId,
        userId,
        user: userInfo,
        message,
        timestamp: Date.now()
      };

      // Store chat message in Redis (optional: for persistence)
      await redisManager.client.lPush(`chat:${documentId}`, JSON.stringify(chatMessage));
      await redisManager.client.lTrim(`chat:${documentId}`, 0, 99); // Keep last 100 messages

      // Publish chat message
      await redisManager.publish('chat:messages', chatMessage);

    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    try {
      const connection = activeConnections.get(socket.id);
      if (connection) {
        const { documentId, userId, userInfo } = connection;

        // Remove user from Redis room
        await redisManager.removeUserFromRoom(documentId, userId);

        // Notify others about user leaving
        await redisManager.publish('user:presence', {
          type: 'user:left',
          documentId,
          user: userInfo
        });

        // Remove from active connections
        activeConnections.delete(socket.id);

        console.log(`User ${userInfo.name} left document ${documentId}`);
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }

    console.log(`User disconnected: ${socket.id}`);
  });
});

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/documents/:id', async (req, res) => {
  try {
    const document = await redisManager.getDocument(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

app.get('/api/documents/:id/history', async (req, res) => {
  try {
    const operations = await redisManager.getOperations(req.params.id);
    res.json(operations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document history' });
  }
});

app.get('/api/documents/:id/chat', async (req, res) => {
  try {
    const messages = await redisManager.client.lRange(`chat:${req.params.id}`, 0, 49);
    const parsedMessages = messages.reverse().map(msg => JSON.parse(msg));
    res.json(parsedMessages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Code execution endpoint
app.post('/api/execute', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code is required and must be a string' });
    }

    console.log('🚀 Executing JavaScript code:', { codeLength: code.length });

    const result = await executeJavaScript(code);
    res.json(result);

  } catch (error) {
    console.error('Error executing code:', error);
    res.status(500).json({ 
      error: 'Code execution failed',
      output: [],
      stderr: error.message,
      executionTime: 0
    });
  }
});

// JavaScript execution function
async function executeJavaScript(code) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let output = [];
    let hasError = false;
    
    // Create a safe wrapper for the code
    const wrappedCode = `
      const originalConsole = console;
      const logs = [];
      
      // Override console methods to capture output
      console.log = (...args) => {
        logs.push({ type: 'log', args: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') });
      };
      
      console.error = (...args) => {
        logs.push({ type: 'error', args: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') });
      };
      
      console.warn = (...args) => {
        logs.push({ type: 'warn', args: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') });
      };
      
      try {
        // User code goes here
        ${code}
        
        // Return the logs
        process.stdout.write(JSON.stringify({ success: true, logs }));
      } catch (error) {
        process.stdout.write(JSON.stringify({ 
          success: false, 
          error: error.message,
          logs 
        }));
      }
    `;

    // Execute the code in a child process
    const child = spawn('node', ['-e', wrappedCode], {
      timeout: 10000, // 10 second timeout
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const executionTime = Date.now() - startTime;
      
      try {
        if (stdout) {
          const result = JSON.parse(stdout);
          
          if (result.success) {
            // Convert logs to terminal format
            output = result.logs.map(log => ({
              type: log.type === 'log' ? 'output' : log.type,
              content: log.args
            }));
          } else {
            hasError = true;
            output = [
              ...result.logs.map(log => ({
                type: log.type === 'log' ? 'output' : log.type,
                content: log.args
              })),
              {
                type: 'error',
                content: `Error: ${result.error}`
              }
            ];
          }
        } else if (stderr) {
          hasError = true;
          output = [{
            type: 'error',
            content: stderr.trim()
          }];
        } else if (code !== 0) {
          hasError = true;
          output = [{
            type: 'error',
            content: `Process exited with code ${code}`
          }];
        }
      } catch (parseError) {
        hasError = true;
        output = [{
          type: 'error',
          content: `Failed to parse execution result: ${parseError.message}`
        }];
      }

      resolve({
        success: !hasError,
        output,
        executionTime,
        stderr: hasError ? stderr : null
      });
    });

    child.on('error', (error) => {
      const executionTime = Date.now() - startTime;
      resolve({
        success: false,
        output: [{
          type: 'error',
          content: `Execution failed: ${error.message}`
        }],
        executionTime,
        stderr: error.message
      });
    });

    // Handle timeout
    setTimeout(() => {
      if (!child.killed) {
        child.kill();
        const executionTime = Date.now() - startTime;
        resolve({
          success: false,
          output: [{
            type: 'error',
            content: 'Execution timed out (10 seconds limit)'
          }],
          executionTime,
          stderr: 'Timeout'
        });
      }
    }, 10000);
  });
}

// Utility function to generate user colors
function generateUserColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await redisManager.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5000;

// Start server
async function startServer() {
  await initializeRedis();
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
