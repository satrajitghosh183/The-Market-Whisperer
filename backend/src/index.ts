import { createApp } from './app';
import { config, validateConfig } from './config';

// Validate configuration
validateConfig();

const app = createApp();

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Market Whisperer API running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${config.port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

