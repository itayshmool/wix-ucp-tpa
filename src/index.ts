import express from 'express';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';

const app = express();

// Middleware
app.use(express.json());

// Health check endpoints for Render.com
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
  });
});

app.get('/health/live', (_req, res) => {
  res.status(200).json({ status: 'alive' });
});

app.get('/health/ready', (_req, res) => {
  res.status(200).json({ status: 'ready' });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Wix UCP TPA',
    version: '0.1.0',
    description: 'Wix Third-Party Application with UCP integration',
    status: 'bootstrap',
    endpoints: {
      health: '/health',
      liveness: '/health/live',
      readiness: '/health/ready',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: config.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
const server = app.listen(config.PORT, () => {
  logger.info('Server started', {
    port: config.PORT,
    environment: config.NODE_ENV,
    node_version: process.version,
  });
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutdown signal received, closing server...');
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
