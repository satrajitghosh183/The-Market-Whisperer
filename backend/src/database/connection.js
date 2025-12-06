import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/market-whisperer';
const USE_MONGODB = process.env.USE_MONGODB !== 'false'; // Default to true

let isConnected = false;
let connectionPromise = null;

/**
 * Connect to MongoDB
 */
export async function connectMongoDB() {
  if (!USE_MONGODB) {
    console.log('⚠️  MongoDB is disabled. Using file-based storage.');
    return null;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If already connecting, return the existing promise
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    tls: true,
    tlsAllowInvalidCertificates: false,
    retryWrites: true,
    w: 'majority',
  })
    .then(() => {
      isConnected = true;
      console.log('✅ Connected to MongoDB');
      return mongoose.connection;
    })
    .catch((error) => {
      connectionPromise = null;
      console.error('❌ MongoDB connection error:', error.message);
      console.warn('⚠️  Falling back to file-based storage');
      throw error;
    });

  return connectionPromise;
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectMongoDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('🔌 Disconnected from MongoDB');
  }
}

/**
 * Check if MongoDB is available
 */
export function isMongoDBAvailable() {
  return USE_MONGODB && mongoose.connection.readyState === 1;
}

/**
 * Get MongoDB connection status
 */
export function getMongoDBStatus() {
  if (!USE_MONGODB) {
    return { available: false, reason: 'MongoDB disabled in configuration' };
  }
  
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    available: state === 1,
    state: states[state] || 'unknown',
    readyState: state
  };
}

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
  isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
  isConnected = true;
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectMongoDB();
  process.exit(0);
});

