const redis = require('redis');
require('dotenv').config();

class RedisManager {
  constructor() {
    this.client = null;
    this.publisher = null;
    this.subscriber = null;
  }

  async connect() {
    try {
      const redisConfig = {
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        socket: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT),
          tls: {
            rejectUnauthorized: false,
            requestCert: true,
            agent: false
          }
        }
      };

      // Main client for general operations
      this.client = redis.createClient(redisConfig);
      await this.client.connect();

      // Publisher for pub/sub
      this.publisher = redis.createClient(redisConfig);
      await this.publisher.connect();

      // Subscriber for pub/sub
      this.subscriber = redis.createClient(redisConfig);
      await this.subscriber.connect();

      console.log('✅ Connected to Redis successfully');

      // Test Redis modules availability
      await this.testModules();

      return true;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  async testModules() {
    try {
      // Test JSON module
      await this.client.json.set('test:json', '$', { test: 'value' });
      await this.client.json.del('test:json');
      console.log('✅ Redis JSON module available');

      // Test Search module
      try {
        await this.client.ft.info('test:index');
      } catch (error) {
        // Index doesn't exist, which is expected
        console.log('✅ Redis Search module available');
      }

      // Test Streams
      await this.client.xAdd('test:stream', '*', { test: 'value' });
      await this.client.del('test:stream');
      console.log('✅ Redis Streams available');

    } catch (error) {
      console.warn('⚠️ Some Redis modules may not be available:', error.message);
    }
  }

  // Document operations using Redis JSON
  async saveDocument(documentId, content) {
    const document = {
      id: documentId,
      content,
      lastModified: Date.now(),
      version: await this.getDocumentVersion(documentId) + 1
    };

    await this.client.json.set(`doc:${documentId}`, '$', document);
    return document;
  }

  async getDocument(documentId) {
    try {
      const document = await this.client.json.get(`doc:${documentId}`);
      return document;
    } catch (error) {
      return null;
    }
  }

  async getDocumentVersion(documentId) {
    try {
      const version = await this.client.json.get(`doc:${documentId}`, { path: '$.version' });
      return version ? version[0] : 0;
    } catch (error) {
      return 0;
    }
  }

  // Operation tracking using Redis Streams
  async addOperation(documentId, operation) {
    const operationData = {
      type: operation.type,
      position: JSON.stringify(operation.position),
      content: operation.content || '',
      userId: operation.userId,
      timestamp: Date.now().toString()
    };

    const streamId = await this.client.xAdd(`ops:${documentId}`, '*', operationData);
    return streamId;
  }

  async getOperations(documentId, fromId = '-', count = 100) {
    try {
      const operations = await this.client.xRange(`ops:${documentId}`, fromId, '+', { COUNT: count });
      return operations.map(op => ({
        id: op.id,
        ...op.message,
        position: JSON.parse(op.message.position),
        timestamp: parseInt(op.message.timestamp)
      }));
    } catch (error) {
      return [];
    }
  }

  // User presence management
  async addUserToRoom(roomId, userId, userInfo) {
    await this.client.hSet(`room:${roomId}:users`, userId, JSON.stringify({
      ...userInfo,
      joinedAt: Date.now()
    }));
  }

  async removeUserFromRoom(roomId, userId) {
    await this.client.hDel(`room:${roomId}:users`, userId);
  }

  async getRoomUsers(roomId) {
    try {
      const users = await this.client.hGetAll(`room:${roomId}:users`);
      const result = {};
      for (const [userId, userInfo] of Object.entries(users)) {
        result[userId] = JSON.parse(userInfo);
      }
      return result;
    } catch (error) {
      return {};
    }
  }

  // Pub/Sub operations
  async publish(channel, message) {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel, callback) {
    await this.subscriber.subscribe(channel, (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        callback(parsedMessage);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
  }

  async unsubscribe(channel) {
    await this.subscriber.unsubscribe(channel);
  }

  // Search operations (will be implemented when search index is created)
  async searchDocuments(query) {
    try {
      // This will be implemented after creating search index
      return [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  async disconnect() {
    if (this.client) await this.client.disconnect();
    if (this.publisher) await this.publisher.disconnect();
    if (this.subscriber) await this.subscriber.disconnect();
  }
}

module.exports = new RedisManager();
