// config/db.js
const mongoose = require('mongoose');
const Redis = require('ioredis'); // We can leave the import

// Singleton pattern for Redis
let redisClient; // We can leave this

const connectDB = async () => {
  try {
    // 1. Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // 2. Connect to Redis
    // redisClient = new Redis(process.env.REDIS_URI);
    // redisClient.on('connect', () => console.log('Redis Connected'));
    // redisClient.on('error', (err) => console.log('Redis Connection Error', err));

  } catch (error) {
    console.error(`Error connecting to databases: ${error.message}`);
    process.exit(1);
  }
};

// Export both the connection function and the Redis client
module.exports = { connectDB, getRedisClient: () => redisClient };