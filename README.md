# CodeSync - Real-time Collaborative Code Editor

## Full Explanation on DEV.to Article
- https://dev.to/depapp/codesync-real-time-collaborative-code-editor-powered-by-redis-15h5

## ✨ Features

### Real-time Collaboration
- **Instant Synchronization**: Changes appear in real-time across all connected users
- **User Presence**: See who's online and their cursor positions
- **Conflict Resolution**: Smart handling of concurrent edits
- **Visual Indicators**: Color-coded user cursors and selections

### Advanced Code Editor
- **Monaco Editor**: Full-featured code editor with syntax highlighting
- **Code Execution**: Run JavaScript code directly in the browser
- **Theme Support**: Light and dark themes

### Communication & Collaboration
- **Real-time Chat**: Integrated chat system for team communication
- **User Management**: Join with custom names and colors
- **Document Sharing**: Share documents via URL
- **Session Persistence**: Documents persist across sessions

### Modern UI/UX
- **Responsive Design**: Works on desktop and mobile devices
- **Intuitive Interface**: Clean, professional design
- **Accessibility**: ARIA labels and keyboard navigation
- **Performance**: Optimized for smooth real-time updates

## 🏗️ Architecture

### Redis as the Core Platform

This application showcases Redis in multiple roles:

1. **Real-time Pub/Sub**: Powers instant collaboration using Redis pub/sub channels
2. **Data Storage**: Documents and user sessions stored in Redis
3. **Session Management**: User presence and state management
4. **Message Queuing**: Chat messages and system events
5. **Caching**: Performance optimization for frequently accessed data

### Technology Stack

**Backend:**
- Node.js with Express
- Socket.IO for WebSocket connections
- Redis for data storage and pub/sub
- VM2 for secure code execution

**Frontend:**
- React with modern hooks
- Monaco Editor (VS Code editor)
- Tailwind CSS for styling
- Socket.IO client for real-time communication

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- Redis instance (local or cloud)
- npm or yarn

### Environment Setup

1. **Clone the repository:**
```bash
git clone <repository-url>
cd beyond-the-cache
```

2. **Install dependencies:**
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

3. **Configure Redis connection:**
Create a `.env` file in the backend directory:
```env
REDIS_USERNAME=your_redis_username
REDIS_PASSWORD=your_redis_password
REDIS_HOST=your_redis_host
REDIS_PORT=your_redis_port
PORT=5002
```

### Running the Application

1. **Start the backend server:**
```bash
cd backend
npm start
```

2. **Start the frontend development server:**
```bash
cd frontend
npm start
```

3. **Open your browser:**
Navigate to `http://localhost:3000`

## 🔧 Key Redis Operations

### Document Synchronization
```javascript
// Publishing document changes
await redis.publish(`doc:${documentId}:changes`, JSON.stringify({
  userId,
  content,
  timestamp,
  operation
}));

// Storing document state
await redis.hset(`doc:${documentId}`, {
  content: JSON.stringify(content),
  lastModified: Date.now(),
  version: version + 1
});
```

### User Presence Management
```javascript
// Track active users
await redis.sadd(`doc:${documentId}:users`, userId);
await redis.expire(`doc:${documentId}:users`, 3600);

// Store user information
await redis.hset(`user:${userId}`, {
  name: user.name,
  color: user.color,
  lastSeen: Date.now()
});
```

### Real-time Chat
```javascript
// Publish chat messages
await redis.publish(`doc:${documentId}:chat`, JSON.stringify({
  userId,
  message,
  timestamp
}));

// Store chat history
await redis.lpush(`doc:${documentId}:messages`, JSON.stringify(message));
await redis.ltrim(`doc:${documentId}:messages`, 0, 100); // Keep last 100 messages
```

## 🚀 Deployment

### Production Considerations

1. **Redis Configuration:**
   - Enable persistence (RDB + AOF)
   - Configure appropriate memory policies
   - Set up Redis clustering for high availability

2. **Security:**
   - Use Redis AUTH and TLS
   - Implement rate limiting
   - Sanitize user inputs

3. **Scaling:**
   - Use Redis Cluster for horizontal scaling
   - Implement load balancing for multiple app instances
   - Consider Redis Streams for more complex event processing

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details

---

**Built with ❤️ and Redis**

*Showcasing Redis as the ultimate multi-model platform for modern applications*
