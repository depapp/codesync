import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect(serverUrl = process.env.REACT_APP_WS_URL || 'http://localhost:5002') {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.isConnected = true;
      this.emit('connection:status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.isConnected = false;
      this.emit('connection:status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.emit('connection:error', error);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.emit('socket:error', error);
    });

    // Document events
    this.socket.on('document:loaded', (data) => {
      console.log('🔄 Socket received document:loaded:', data);
      this.emit('document:loaded', data);
    });

    this.socket.on('document:change', (data) => {
      console.log('📨 Socket received document:change:', {
        userId: data.userId,
        contentLength: data.content?.length,
        timestamp: data.timestamp
      });
      this.emit('document:change', data);
    });

    // User presence events
    this.socket.on('user:presence', (data) => {
      this.emit('user:presence', data);
    });

    this.socket.on('cursor:update', (data) => {
      this.emit('cursor:update', data);
    });

    // Chat events
    this.socket.on('chat:message', (data) => {
      this.emit('chat:message', data);
    });
  }

  // Join a document room
  joinDocument(documentId, user) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('join:document', {
      documentId,
      user
    });
  }

  // Send document changes
  sendDocumentChange(content, operation = null) {
    if (!this.socket) return;

    this.socket.emit('document:change', {
      content,
      operation
    });
  }

  // Send cursor updates
  sendCursorUpdate(position, selection = null) {
    if (!this.socket) return;

    this.socket.emit('cursor:update', {
      position,
      selection
    });
  }

  // Send chat message
  sendChatMessage(message) {
    if (!this.socket) return;

    this.socket.emit('chat:send', {
      message
    });
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
